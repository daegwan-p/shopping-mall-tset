/**
 * Enforce: only 3 products per category keep model/people images.
 * Other products use official gallery shots with no detectable face.
 *
 * Run: node src/scripts/limitPeopleImages.js
 */
require("dotenv").config();
const { resolveMongoUri } = require("../config/mongoUri");
const https = require("https");
const mongoose = require("mongoose");
const sharp = require("sharp");

const Brand = require("../models/Brand");
const Product = require("../models/Product");

const MONGODB_URI = resolveMongoUri();

const CATEGORIES = ["아우터", "상의", "셔츠", "니트", "팬츠", "액세서리"];
const WITH_PEOPLE = 3;

const HOST = {
  lmood: "https://lmood.co.kr",
  knitted: "https://knitted.co.kr",
  drawfit: "https://draw-fit.com",
};

function getHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9",
            Referer: new URL(url).origin + "/",
          },
        },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => resolve({ status: res.statusCode, body: d }));
        }
      )
      .on("error", reject);
  });
}

function getBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Referer: new URL(url).origin + "/",
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({ status: res.statusCode, buf: Buffer.concat(chunks) })
          );
        }
      )
      .on("error", reject);
  });
}

function brandKeyFrom(brand) {
  const slug = brand?.slug || "";
  const name = brand?.name || "";
  if (slug === "lmood" || /엘무드|LMOOD/i.test(name)) return "lmood";
  if (slug === "knitted" || /니티드|KNITTED/i.test(name)) return "knitted";
  if (slug === "draw-fit" || /드로우핏|DRAW/i.test(name)) return "drawfit";
  return "";
}

function productNoFromSku(sku) {
  const m = String(sku || "").match(/(\d+)$/);
  return m ? m[1] : "";
}

function extractGallery(html, origin) {
  const urls = [];
  const re =
    /(?:src|data-src|data-original)="((?:https?:)?\/\/[^"]+\/web\/product\/[^"]+|\/web\/product\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (/icon|btn|common|logo|banner|placeholder/i.test(u)) continue;
    if (u.startsWith("//")) u = "https:" + u;
    if (u.startsWith("/")) u = origin + u;
    u = u.replace(/\/(small|medium|tiny)\//, "/big/");
    if (!urls.includes(u)) urls.push(u);
  }
  return urls;
}

function isSkin(r, g, b) {
  if (r < 70 || g < 45 || b < 25) return false;
  if (r > 230 && g > 230 && b > 230) return false;
  if (r > 180 && g < 90 && b < 90) return false;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 80 && cb <= 130 && cr >= 130 && cr <= 175;
}

async function analyze(buf) {
  if (!buf || buf.length < 800) return null;
  const head = buf.slice(0, 24).toString().toLowerCase();
  if (head.includes("<!doc") || head.includes("<html") || head.includes("404"))
    return null;
  try {
    const { data, info } = await sharp(buf)
      .resize(160, 160, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const x0 = Math.floor(info.width * 0.35);
    const x1 = Math.floor(info.width * 0.65);
    const y0 = Math.floor(info.height * 0.05);
    const y1 = Math.floor(info.height * 0.22);
    let skin = 0;
    let n = 0;
    let white = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 3;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 235 && g > 235 && b > 235) white += 1;
        if (x >= x0 && x < x1 && y >= y0 && y < y1) {
          n += 1;
          if (isSkin(r, g, b)) skin += 1;
        }
      }
    }
    const face = skin / Math.max(1, n);
    return {
      face,
      white: white / (info.width * info.height),
      hasPerson: face >= 0.06,
    };
  } catch {
    return null;
  }
}

async function resolveWorking(url) {
  const variants = [
    url,
    url.replace("/big/", "/medium/"),
    url.replace("/extra/big/", "/extra/medium/"),
    url.replace("/big/", "/small/"),
    url.replace("/extra/big/", "/extra/small/"),
  ];
  const seen = new Set();
  for (const v of variants) {
    if (seen.has(v)) continue;
    seen.add(v);
    const { status, buf } = await getBuf(v);
    if (status !== 200 || !buf) continue;
    const a = await analyze(buf);
    if (a) return { url: v, ...a };
  }
  return null;
}

async function fetchCandidates(brandKey, productNo, currentUrl) {
  const origin = HOST[brandKey];
  const list = [];
  if (currentUrl) list.push(currentUrl);
  if (origin && productNo) {
    const { status, body } = await getHtml(
      `${origin}/product/detail.html?product_no=${productNo}`
    );
    if (status === 200) {
      for (const u of extractGallery(body, origin)) {
        if (!list.includes(u)) list.push(u);
      }
    }
  }
  const scored = [];
  const seen = new Set();
  for (const u of list) {
    const r = await resolveWorking(u);
    if (!r) continue;
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    scored.push(r);
  }
  return scored;
}

function pickBestNoPerson(scored) {
  const noPeople = scored.filter((s) => !s.hasPerson);
  if (!noPeople.length) return null;
  // Prefer more white background (flat / product-only studio)
  noPeople.sort((a, b) => b.white - a.white || a.face - b.face);
  return noPeople[0];
}

function pickBestPerson(scored) {
  const people = scored.filter((s) => s.hasPerson);
  if (!people.length) return scored[0] || null;
  people.sort((a, b) => b.face - a.face);
  return people[0];
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  const brands = await Brand.find({
    $or: [
      { slug: { $in: ["lmood", "knitted", "draw-fit"] } },
      { name: /엘무드|니티드|드로우핏|LMOOD|KNITTED|DRAW/i },
    ],
  });
  const brandMap = new Map(brands.map((b) => [String(b._id), b]));

  for (const category of CATEGORIES) {
    const products = await Product.find({
      brand: { $in: brands.map((b) => b._id) },
      category,
    }).sort({ sku: 1 });

    console.log(`\n=== ${category} (${products.length}) ===`);

    const analyzed = [];
    for (const product of products) {
      const brand = brandMap.get(String(product.brand));
      const brandKey = brandKeyFrom(brand);
      const productNo = productNoFromSku(product.sku);
      const current = product.images?.[0]?.url || "";
      const scored = await fetchCandidates(brandKey, productNo, current);
      const noPerson = pickBestNoPerson(scored);
      const person = pickBestPerson(scored);
      analyzed.push({
        product,
        scored,
        noPerson,
        person,
        canNoPerson: Boolean(noPerson),
        hasPersonOption: Boolean(person),
      });
      const flag = noPerson ? "flat-ok" : "people-only";
      console.log(
        `  ${product.sku} gallery=${scored.length} ${flag}` +
          (noPerson ? ` face=${noPerson.face.toFixed(3)}` : "")
      );
    }

    // Prefer products that already have strong person shots for the 3 wear slots
    const withPersonOpts = analyzed
      .filter((a) => a.hasPersonOption)
      .sort(
        (a, b) => (b.person?.face || 0) - (a.person?.face || 0)
      );
    const wearSet = new Set(
      withPersonOpts.slice(0, WITH_PEOPLE).map((a) => String(a.product._id))
    );

    // If fewer than 3 person options, fill wear slots from any remaining
    if (wearSet.size < WITH_PEOPLE) {
      for (const a of analyzed) {
        if (wearSet.size >= WITH_PEOPLE) break;
        wearSet.add(String(a.product._id));
      }
    }

    let wear = 0;
    let flat = 0;
    let failed = 0;

    for (const a of analyzed) {
      const id = String(a.product._id);
      let chosen = null;
      let type = "main";

      if (wearSet.has(id) && wear < WITH_PEOPLE) {
        chosen = a.person || a.scored[0];
        type = "wear";
        wear += 1;
      } else if (a.noPerson) {
        chosen = a.noPerson;
        type = "main";
        flat += 1;
      } else {
        // Must not keep person shot beyond quota — try lowest-face image
        const sorted = [...a.scored].sort(
          (x, y) => x.face - y.face || y.white - x.white
        );
        chosen = sorted[0] || null;
        if (chosen?.hasPerson) {
          // still a person: keep but count as failed soft
          failed += 1;
          type = "main";
        } else {
          flat += 1;
        }
      }

      if (!chosen) {
        console.log("  ! no image", a.product.sku);
        continue;
      }

      a.product.images = [{ url: chosen.url, type, order: 0 }];
      a.product.markModified("images");
      await a.product.save();
    }

    console.log(
      `  result wear=${wear} flat=${flat} peopleOnlyFallback=${failed}`
    );
  }

  // verify
  console.log("\n=== verify face detection on saved mains ===");
  for (const category of CATEGORIES) {
    const products = await Product.find({
      brand: { $in: brands.map((b) => b._id) },
      category,
    });
    let people = 0;
    let wearType = 0;
    for (const p of products) {
      if (p.images?.[0]?.type === "wear") wearType += 1;
      const url = p.images?.[0]?.url;
      if (!url) continue;
      const r = await resolveWorking(url);
      if (r?.hasPerson) people += 1;
    }
    console.log(
      category,
      `wearType=${wearType}`,
      `detectedPeople=${people}`,
      `total=${products.length}`
    );
  }

  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

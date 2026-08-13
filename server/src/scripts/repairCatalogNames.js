/**
 * Repair broken names (e.g. "엘무드 블랙") and top up categories to 30.
 * Run: node src/scripts/repairCatalogNames.js
 */
require("dotenv").config();
const { resolveMongoUri } = require("../config/mongoUri");
const https = require("https");
const mongoose = require("mongoose");
const sharp = require("sharp");

const Brand = require("../models/Brand");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const {
  styleKey,
  colorFromLabel,
  displayNameFromLabel,
} = require("../utils/styleKey");

const MONGODB_URI = resolveMongoUri();
const CATEGORIES = ["아우터", "상의", "셔츠", "니트", "팬츠", "액세서리"];
const TARGET = 30;
const SIZES = ["XS", "S", "M", "L", "XL"];
const PREFIX = { lmood: "LMOOD", knitted: "KNITTED", drawfit: "DRAWFIT" };
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
            "User-Agent": "Mozilla/5.0",
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
          const c = [];
          res.on("data", (x) => c.push(x));
          res.on("end", () =>
            resolve({ status: res.statusCode, buf: Buffer.concat(c) })
          );
        }
      )
      .on("error", reject);
  });
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
  const h = buf.slice(0, 20).toString().toLowerCase();
  if (h.includes("<html")) return null;
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
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 3;
        if (x >= x0 && x < x1 && y >= y0 && y < y1) {
          n += 1;
          if (isSkin(data[i], data[i + 1], data[i + 2])) skin += 1;
        }
      }
    }
    return { hasPerson: skin / Math.max(1, n) >= 0.06 };
  } catch {
    return null;
  }
}

async function resolveWorking(url) {
  for (const v of [
    url,
    url.replace("/big/", "/medium/"),
    url.replace("/extra/big/", "/extra/medium/"),
  ]) {
    const { status, buf } = await getBuf(v);
    if (status !== 200) continue;
    const a = await analyze(buf);
    if (a) return { url: v, ...a };
  }
  return null;
}

function classify(text) {
  const s = String(text).toLowerCase();
  if (/팬츠|데님|슬랙스|진|조거|치노|바지|pants|denim|slacks|jean|trouser/.test(s)) {
    if (/자켓|재킷|코트|트러커|셔츠/.test(s)) {
      if (/티셔츠|맨투맨|스웨트|후드/.test(s)) return "상의";
      if (/셔츠/.test(s) && !/자켓|재킷|코트|트러커/.test(s)) return "셔츠";
      if (/자켓|재킷|코트|트러커/.test(s)) return "아우터";
    }
    return "팬츠";
  }
  if (
    /코트|자켓|재킷|블루종|블레이저|파카|무스탕|트러커|패딩|봄버|후드.?집업|jacket|coat|blazer|trucker|padding|varsity/.test(
      s
    )
  )
    return "아우터";
  if (/니트|가디건|스웨터|풀오버|knit|cardigan|sweater/.test(s)) return "니트";
  if (
    /티셔츠|맨투맨|스웨트|후드(?!\s*집업)|tee|t-shirt|sweat|hoodie|실켓|슬리브리스|롱\s*슬리브|반팔|긴팔(?!\s*셔츠)/.test(
      s
    )
  )
    return "상의";
  if (/셔츠|shirt|블라우스|oxford|linen/.test(s)) return "셔츠";
  if (
    /백|벨트|캡|가방|슈즈|주얼리|잡화|비니|머플러|양말|bag|belt|cap|acc|wallet|shoes/.test(
      s
    )
  )
    return "액세서리";
  return null;
}

function extractLabel(html) {
  const patterns = [
    /id="span_product_price_text"[^>]*>[\s\S]*?name[^>]*>/i,
    /class="headingArea"[\s\S]*?<h1[^>]*>([^<]+)/i,
    /class="name"[^>]*>\s*(?:<span[^>]*>)?([^<]+)/i,
    /property="og:title"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:title"/i,
    /alt="([^"]+)"[^>]*class="[^"]*(?:BigImage|big|ThumbImage)/i,
    /class="[^"]*(?:BigImage|big|ThumbImage)[^"]*"[^>]*alt="([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    let t = m[1]
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/\s*[-|].*(엘무드|니티드|드로우|LMOOD|KNITTED|DRAW).*$/i, "")
      .trim();
    if (/^(엘무드|니티드|드로우핏|LMOOD|KNITTED|DRAW-?FIT)$/i.test(t)) continue;
    if (t.length >= 4) return t;
  }
  // product path slug in canonical
  const can = html.match(
    /rel="canonical"[^>]*href="[^"]*\/product\/([^/]+)\/\d+/i
  );
  if (can?.[1]) return decodeURIComponent(can[1]);
  return "";
}

async function bestFlat(origin, productNo, seed) {
  const list = seed ? [seed] : [];
  const { status, body } = await getHtml(
    `${origin}/product/detail.html?product_no=${productNo}`
  );
  if (status === 200) {
    const re =
      /(?:src|data-src)="((?:https?:)?\/\/[^"]+\/web\/product\/[^"]+|\/web\/product\/[^"]+)"/gi;
    let m;
    while ((m = re.exec(body))) {
      let u = m[1];
      if (/icon|btn|logo/i.test(u)) continue;
      if (u.startsWith("//")) u = "https:" + u;
      if (u.startsWith("/")) u = origin + u;
      u = u.replace(/\/(small|medium|tiny)\//, "/big/");
      if (!list.includes(u)) list.push(u);
    }
  }
  for (const u of list) {
    const r = await resolveWorking(u);
    if (r && !r.hasPerson) return r;
  }
  for (const u of list) {
    const r = await resolveWorking(u);
    if (r) return r;
  }
  return null;
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  const brands = {
    lmood: await Brand.findOne({ slug: "lmood" }),
    knitted: await Brand.findOne({ slug: "knitted" }),
    drawfit: await Brand.findOne({ slug: "draw-fit" }),
  };
  const brandIds = Object.values(brands).map((b) => b._id);

  // 1) Fix broken brand-only names
  const broken = await Product.find({
    brand: { $in: brandIds },
    name: /^(엘무드|니티드|드로우핏)\s/i,
  });
  console.log("broken", broken.length);
  for (const p of broken) {
    const brand = Object.values(brands).find(
      (b) => String(b._id) === String(p.brand)
    );
    const key =
      brand?.slug === "lmood"
        ? "lmood"
        : brand?.slug === "knitted"
          ? "knitted"
          : "drawfit";
    const no = String(p.sku).match(/(\d+)$/)?.[1];
    const origin = HOST[key];
    const { status, body } = await getHtml(
      `${origin}/product/detail.html?product_no=${no}`
    );
    let label = status === 200 ? extractLabel(body) : "";
    if (!label) {
      // last resort from description
      label = (p.description || "").replace(/.*#/, "item ");
    }
    const color = colorFromLabel(label || p.name);
    const name = displayNameFromLabel(label || `상품 ${no}`, color);
    if (/^(엘무드|니티드|드로우핏)\s/i.test(name)) {
      console.log("! still bad", p.sku, label);
      continue;
    }
    p.name = name;
    await p.save();
    await ProductVariant.updateMany(
      { product: p._id },
      { $set: { color } }
    );
    console.log("repaired", p.sku, name, color);
  }

  // 2) Top up thin categories with unique line keys
  const usedSkus = new Set(
    (await Product.find({ brand: { $in: brandIds } }).select("sku")).map(
      (p) => p.sku
    )
  );

  async function scrapeCandidates(category) {
    const items = [];
    const addCafe = (html, brandKey) => {
      for (const block of html.split(/id="anchorBoxId_/i).slice(1)) {
        const href = block.match(/href="(\/product\/([^"/]+)\/(\d+)\/[^"]*)"/i);
        const img = block.match(
          /src="((?:https?:)?\/\/[^"]+\/web\/product\/(?:big|medium|small)\/[^"]+)"/i
        );
        const price = block.match(/([\d,]+)원|&#8361;([\d,]+)/);
        if (!href || !img) continue;
        const slug = decodeURIComponent(href[2]);
        if (/^w-/i.test(slug)) continue;
        if (classify(slug) !== category) continue;
        items.push({
          brandKey,
          productNo: href[3],
          label: slug,
          image: img[1].startsWith("//") ? "https:" + img[1] : img[1],
          price: Number((price?.[1] || price?.[2] || "0").replace(/,/g, "")),
        });
      }
    };
    const addDf = (html) => {
      for (const block of html.split(/<li class="item[^"]*"/i).slice(1)) {
        const no = block.match(/product_no=(\d+)/i)?.[1];
        const alt = block.match(
          /class="(?:big|medium) lazy-img"[^>]*alt="([^"]+)"/i
        )?.[1];
        const img = block.match(
          /src="((?:https?:)?\/\/[^"]+\/web\/product\/(?:big|medium|small)\/[^"]+)"/i
        )?.[1];
        const price = Number(
          (block.match(/&#8361;([\d,]+)/)?.[1] || "0").replace(/,/g, "")
        );
        if (!no || !img || !alt || !price) continue;
        if (classify(alt) !== category) continue;
        items.push({
          brandKey: "drawfit",
          productNo: no,
          label: alt,
          image: img.startsWith("//") ? "https:" + img : img,
          price,
        });
      }
    };

    for (const cate of [42, 43, 44, 45, 49, 64, 76, 97, 100, 210, 211, 269, 271]) {
      const { status, body } = await getHtml(
        `https://draw-fit.com/product/list.html?cate_no=${cate}`
      );
      if (status === 200) addDf(body);
    }
    for (let cate = 130; cate <= 180; cate++) {
      const { status, body } = await getHtml(
        `https://lmood.co.kr/product/list.html?cate_no=${cate}`
      );
      if (status === 200) addCafe(body, "lmood");
    }
    for (const cate of [1001, 1002, 1003, 1004, 1005, 1006]) {
      const { status, body } = await getHtml(
        `https://knitted.co.kr/product/list.html?cate_no=${cate}`
      );
      if (status === 200) addCafe(body, "knitted");
    }
    return items;
  }

  for (const category of CATEGORIES) {
    let count = await Product.countDocuments({
      brand: { $in: brandIds },
      category,
    });
    if (count >= TARGET) {
      console.log(category, "ok", count);
      continue;
    }
    const need = TARGET - count;
    console.log(category, "need", need);
    const usedStyles = new Set(
      (
        await Product.find({ brand: { $in: brandIds }, category }).select(
          "name"
        )
      ).map((p) => styleKey(p.name))
    );
    const pool = await scrapeCandidates(category);
    let added = 0;
    for (const item of pool) {
      if (added >= need) break;
      const sku = `${PREFIX[item.brandKey]}-${item.productNo}`;
      if (usedSkus.has(sku)) continue;
      const color = colorFromLabel(item.label);
      const name = displayNameFromLabel(item.label, color);
      const sk = styleKey(name);
      if (!sk || usedStyles.has(sk)) continue;
      if (/^(엘무드|니티드|드로우핏)\s/i.test(name)) continue;

      const img = await bestFlat(
        HOST[item.brandKey],
        item.productNo,
        item.image
      );
      if (!img) continue;
      const brand = brands[item.brandKey];
      const product = await Product.create({
        brand: brand._id,
        category,
        name,
        sku,
        price: Math.round(item.price / 100),
        discountRate: 0,
        description: `${brand.name} 공식몰 #${item.productNo}`,
        images: [
          { url: img.url, type: img.hasPerson ? "wear" : "main", order: 0 },
        ],
        shippingOrigin: "국내",
        commissionRate: brand.commissionRate ?? 0,
        status: "published",
        totalStock: 25,
      });
      await ProductVariant.insertMany(
        SIZES.map((size) => ({
          product: product._id,
          color,
          size,
          stock: 5,
          sku: `${sku}-${color.slice(0, 2)}-${size}`
            .replace(/\s/g, "")
            .toUpperCase(),
        }))
      );
      usedSkus.add(sku);
      usedStyles.add(sk);
      added += 1;
      console.log("+", category, sku, name);
    }
    console.log(
      category,
      "now",
      await Product.countDocuments({ brand: { $in: brandIds }, category })
    );
  }

  // final report
  for (const c of CATEGORIES) {
    const ps = await Product.find({ brand: { $in: brandIds }, category: c });
    const styles = new Set(ps.map((p) => styleKey(p.name)));
    const bad = ps.filter((p) => /^(엘무드|니티드|드로우핏)\s/i.test(p.name));
    console.log(
      c,
      `n=${ps.length}`,
      `styles=${styles.size}`,
      `badNames=${bad.length}`
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

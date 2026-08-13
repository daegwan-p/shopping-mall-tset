/**
 * Replace products that still show people (beyond the 3 wear slots)
 * with other official-brand products that have no-person gallery images.
 *
 * Run: node src/scripts/replacePeopleOnlyProducts.js
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

const MONGODB_URI = resolveMongoUri();

const CATEGORIES = ["아우터", "상의", "셔츠", "니트", "팬츠", "액세서리"];
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
    /백|벨트|캡|가방|슈즈|주얼리|잡화|비니|머플러|양말|bag|belt|cap|acc|wallet/.test(
      s
    )
  )
    return "액세서리";
  return null;
}

function colorFrom(label) {
  const m = String(label).match(/\[([^\]]+)\]/);
  const raw = (m?.[1] || String(label).split("-").pop() || "BLACK").toUpperCase();
  const map = {
    BLACK: "블랙",
    WHITE: "화이트",
    NAVY: "네이비",
    GREY: "그레이",
    GRAY: "그레이",
    CHARCOAL: "차콜",
    BEIGE: "베이지",
    BLUE: "블루",
    CREAM: "베이지",
    BROWN: "브라운",
    IVORY: "아이보리",
    MELANGE: "그레이",
  };
  return map[raw] || map[raw.split(" ")[0]] || "블랙";
}

function displayName(label, color) {
  let base = String(label)
    .replace(/\[([^\]]+)\]/g, "")
    .replace(/-/g, " ")
    .replace(/^unisex\s*/i, "")
    .replace(/^young\s*/i, "영 ")
    .replace(/^mataiga\s*/i, "마타이가 ")
    .replace(/\s+/g, " ")
    .trim();
  base = base.replace(
    /\s+(BLACK|WHITE|NAVY|GREY|GRAY|CHARCOAL|BEIGE|BLUE|CREAM|BROWN|IVORY|MELANGE)$/i,
    ""
  );
  return `${base} ${color}`.replace(/\s+/g, " ").trim();
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
  if (head.includes("<!doc") || head.includes("<html")) return null;
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
    return { face, white: white / (info.width * info.height), hasPerson: face >= 0.06 };
  } catch {
    return null;
  }
}

async function resolveWorking(url) {
  for (const v of [
    url,
    url.replace("/big/", "/medium/"),
    url.replace("/extra/big/", "/extra/medium/"),
    url.replace("/big/", "/small/"),
  ]) {
    const { status, buf } = await getBuf(v);
    if (status !== 200 || !buf) continue;
    const a = await analyze(buf);
    if (a) return { url: v, ...a };
  }
  return null;
}

function extractGallery(html, origin) {
  const urls = [];
  const re =
    /(?:src|data-src|data-original)="((?:https?:)?\/\/[^"]+\/web\/product\/[^"]+|\/web\/product\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (/icon|btn|common|logo|banner/i.test(u)) continue;
    if (u.startsWith("//")) u = "https:" + u;
    if (u.startsWith("/")) u = origin + u;
    u = u.replace(/\/(small|medium|tiny)\//, "/big/");
    if (!urls.includes(u)) urls.push(u);
  }
  return urls;
}

async function bestFlatImage(brandKey, productNo, seedUrl) {
  const origin = HOST[brandKey];
  const list = [];
  if (seedUrl) list.push(seedUrl);
  if (origin && productNo) {
    const { status, body } = await getHtml(
      `${origin}/product/detail.html?product_no=${productNo}`
    );
    if (status === 200) list.push(...extractGallery(body, origin));
  }
  let best = null;
  const seen = new Set();
  for (const u of list) {
    const r = await resolveWorking(u);
    if (!r || r.hasPerson) continue;
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    if (!best || r.white > best.white || r.face < best.face) best = r;
  }
  return best;
}

function parseCafe24(html, brandKey) {
  const items = [];
  for (const block of html.split(/id="anchorBoxId_/i).slice(1)) {
    const href = block.match(/href="(\/product\/([^"/]+)\/(\d+)\/[^"]*)"/i);
    const img = block.match(
      /src="((?:https?:)?\/\/[^"]+\/web\/product\/(?:big|medium|small)\/[^"]+)"/i
    );
    const price = block.match(/([\d,]+)원|&#8361;([\d,]+)/);
    if (!href || !img) continue;
    const slug = decodeURIComponent(href[2]);
    if (/^w-/i.test(slug)) continue;
    items.push({
      brandKey,
      productNo: href[3],
      label: slug,
      image: img[1].startsWith("//") ? "https:" + img[1] : img[1],
      price: Number((price?.[1] || price?.[2] || "0").replace(/,/g, "")),
      category: classify(slug),
    });
  }
  return items;
}

function parseDrawfit(html) {
  const items = [];
  for (const block of html.split(/<li class="item[^"]*"/i).slice(1)) {
    const no = block.match(/product_no=(\d+)/i);
    const alt = block.match(
      /class="(?:big|medium) lazy-img"[^>]*alt="([^"]+)"/i
    );
    const img = block.match(
      /src="((?:https?:)?\/\/[^"]+\/web\/product\/(?:big|medium|small)\/[^"]+)"/i
    );
    const price = block.match(
      /original_price[^>]*>\s*&#8361;([\d,]+)|&#8361;([\d,]+)/i
    );
    if (!no || !img) continue;
    const label = alt?.[1] || `item-${no[1]}`;
    items.push({
      brandKey: "drawfit",
      productNo: no[1],
      label,
      image: img[1].startsWith("//") ? "https:" + img[1] : img[1],
      price: Number((price?.[1] || price?.[2] || "0").replace(/,/g, "")),
      category: classify(label),
    });
  }
  return items;
}

async function scrapePool() {
  const map = new Map();
  const add = (item) => {
    if (!item.category || !item.price) return;
    const key = `${item.brandKey}-${item.productNo}`;
    if (!map.has(key)) map.set(key, item);
  };

  // Draw-fit broad
  for (const cate of [
    42, 43, 44, 45, 49, 59, 61, 64, 67, 76, 77, 85, 97, 100, 101, 104, 105, 210,
    211, 212, 269, 271, 272, 273, 274, 275, 276, 277, 279, 280, 281,
  ]) {
    for (const page of [1, 2]) {
      const { status, body } = await getHtml(
        `https://draw-fit.com/product/list.html?cate_no=${cate}&page=${page}`
      );
      if (status === 200) parseDrawfit(body).forEach(add);
    }
  }
  // Lmood
  for (let cate = 130; cate <= 200; cate++) {
    for (const page of [1, 2]) {
      const { status, body } = await getHtml(
        `https://lmood.co.kr/product/list.html?cate_no=${cate}&page=${page}`
      );
      if (status === 200) parseCafe24(body, "lmood").forEach(add);
    }
  }
  // Knitted
  for (const cate of [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1016, 1040]) {
    for (const page of [1, 2, 3]) {
      const { status, body } = await getHtml(
        `https://knitted.co.kr/product/list.html?cate_no=${cate}&page=${page}`
      );
      if (status === 200) parseCafe24(body, "knitted").forEach(add);
    }
  }
  return [...map.values()];
}

async function replaceProduct(oldProduct, brand, item, flat) {
  const sku = `${PREFIX[item.brandKey]}-${item.productNo}`;
  const color = colorFrom(item.label);
  const price = Math.round(item.price / 100);
  if (!price) return false;

  // clear refs
  await ProductVariant.deleteMany({ product: oldProduct._id });
  await Cart.updateMany({}, { $pull: { items: { product: oldProduct._id } } });
  await Wishlist.updateMany(
    {},
    { $pull: { items: { product: oldProduct._id } } }
  );

  oldProduct.brand = brand._id;
  oldProduct.category = item.category;
  oldProduct.name = displayName(item.label, color);
  oldProduct.sku = sku;
  oldProduct.price = price;
  oldProduct.description = `${brand.name} 공식몰 상품 #${item.productNo}`;
  oldProduct.images = [{ url: flat.url, type: "main", order: 0 }];
  oldProduct.commissionRate = brand.commissionRate ?? 0;
  oldProduct.status = "published";
  oldProduct.totalStock = SIZES.length * 5;
  oldProduct.markModified("images");
  await oldProduct.save();

  await ProductVariant.insertMany(
    SIZES.map((size) => ({
      product: oldProduct._id,
      color,
      size,
      stock: 5,
      sku: `${sku}-${color.slice(0, 2)}-${size}`
        .replace(/\s/g, "")
        .toUpperCase(),
    }))
  );
  return true;
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  const brands = {
    lmood: await Brand.findOne({ slug: "lmood" }),
    knitted: await Brand.findOne({ slug: "knitted" }),
    drawfit: await Brand.findOne({ slug: "draw-fit" }),
  };
  const brandIds = Object.values(brands).map((b) => b._id);

  console.log("scraping candidate pool...");
  const pool = await scrapePool();
  console.log("pool", pool.length);

  const existingSkus = new Set(
    (await Product.find({ brand: { $in: brandIds } }).select("sku")).map(
      (p) => p.sku
    )
  );

  // Prefilter pool items that have flat images (lazy per category as needed)
  const flatCache = new Map();

  async function getFlatCandidate(category, usedKeys) {
    const candidates = pool.filter(
      (p) =>
        p.category === category &&
        !existingSkus.has(`${PREFIX[p.brandKey]}-${p.productNo}`) &&
        !usedKeys.has(`${p.brandKey}-${p.productNo}`)
    );
    for (const item of candidates) {
      const key = `${item.brandKey}-${item.productNo}`;
      let flat = flatCache.get(key);
      if (flat === undefined) {
        flat = await bestFlatImage(item.brandKey, item.productNo, item.image);
        flatCache.set(key, flat || null);
      }
      if (!flat) continue;
      usedKeys.add(key);
      return { item, flat };
    }
    return null;
  }

  for (const category of CATEGORIES) {
    const products = await Product.find({
      brand: { $in: brandIds },
      category,
    }).sort({ sku: 1 });

    const offenders = [];
    for (const p of products) {
      const type = p.images?.[0]?.type;
      if (type === "wear") continue; // allowed people
      const url = p.images?.[0]?.url;
      if (!url) {
        offenders.push(p);
        continue;
      }
      const scored = await resolveWorking(url);
      if (!scored || scored.hasPerson) offenders.push(p);
    }

    console.log(`\n=== ${category}: replace ${offenders.length} people shots ===`);
    const usedKeys = new Set();
    let replaced = 0;

    for (const old of offenders) {
      const found = await getFlatCandidate(category, usedKeys);
      if (!found) {
        console.log("  ! no flat candidate left for", old.sku);
        continue;
      }
      const brand = brands[found.item.brandKey];
      const newSku = `${PREFIX[found.item.brandKey]}-${found.item.productNo}`;
      // avoid unique sku collision with another doc
      const clash = await Product.findOne({
        sku: newSku,
        _id: { $ne: old._id },
      });
      if (clash) continue;

      const ok = await replaceProduct(old, brand, found.item, found.flat);
      if (ok) {
        existingSkus.delete(old.sku);
        existingSkus.add(newSku);
        replaced += 1;
        console.log(`  ${old.sku} → ${newSku} ${found.item.label.slice(0, 40)}`);
      }
    }
    console.log("  replaced", replaced);
  }

  console.log("\n=== final verify ===");
  for (const category of CATEGORIES) {
    const products = await Product.find({ brand: { $in: brandIds }, category });
    let people = 0;
    let wear = 0;
    for (const p of products) {
      if (p.images?.[0]?.type === "wear") wear += 1;
      const r = p.images?.[0]?.url
        ? await resolveWorking(p.images[0].url)
        : null;
      if (r?.hasPerson) people += 1;
    }
    console.log(
      category,
      `wearType=${wear}`,
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

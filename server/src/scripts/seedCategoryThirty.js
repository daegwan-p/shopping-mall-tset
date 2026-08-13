/**
 * Seed catalog from 3 brand sites:
 * - 엘무드(LMOOD) / 니티드(KNITTED) / 드로우핏(DRAW-FIT)
 *
 * Per OUR category (아우터·상의·셔츠·니트·팬츠·액세서리):
 *   30 products = prefer 10 per brand (popularity order)
 *   ALL images from official brand CDNs only (no Unsplash)
 *   After seed, run: npm run fix:people-limit
 *   (카테고리당 착용/사람 컷 3장만 유지, 나머지는 무인 컷)
 *
 * Run: node src/scripts/seedCategoryThirty.js
 */
require("dotenv").config();
const { resolveMongoUri } = require("../config/mongoUri");
const https = require("https");
const mongoose = require("mongoose");

const Brand = require("../models/Brand");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const { styleKey, colorFromLabel, displayNameFromLabel } = require("../utils/styleKey");

const MONGODB_URI = resolveMongoUri();

const CATEGORIES = ["아우터", "상의", "셔츠", "니트", "팬츠", "액세서리"];
const SIZES = ["XS", "S", "M", "L", "XL"];
const WITH_PEOPLE_PER_CATEGORY = 3;
const PER_BRAND = 10;

const NO_PEOPLE_IMAGES = {
  아우터: [
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80",
  ],
  셔츠: [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1586790170083-2f9ceadc646d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1563630423918-b58f07336ac5?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=80",
  ],
  상의: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1571945151617-46ce4644d423?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1620799140188-3b2a02fd9eb3?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=900&q=80",
  ],
  니트: [
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1571945151617-46ce4644d423?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1620799140188-3b2a02fd9eb3?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
  ],
  팬츠: [
    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1506629082955-511b1aa78283?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1584865288642-42078af8adcb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
  ],
  액세서리: [
    "https://images.unsplash.com/photo-1624222247344-550fb60583fd?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1601924999988-f88f5c4f0f1e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1590874103328-eac38a67478f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1624222247344-550fb60583fd?auto=format&fit=crop&w=900&q=80",
  ],
};

function get(url) {
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

function checkImage(url) {
  return new Promise((resolve) => {
    try {
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
            res.resume();
            resolve(res.statusCode === 200);
          }
        )
        .on("error", () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

async function resolveOfficialImage(raw) {
  if (!raw) return "";
  let image = raw.startsWith("//") ? "https:" + raw : raw;
  const candidates = [
    image,
    image.replace("/big/", "/medium/").replace("/small/", "/medium/"),
    image.replace("/big/", "/small/").replace("/medium/", "/small/"),
    image.replace("/small/", "/big/").replace("/medium/", "/big/"),
  ];
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    if (await checkImage(c)) return c;
  }
  return image;
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
  // 상의: 티셔츠·맨투맨·스웨트·후드 등 (옥스포드/버튼 셔츠는 제외)
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

function parseCafe24Anchor(html) {
  const items = [];
  for (const block of html.split(/id="anchorBoxId_/i).slice(1)) {
    const href = block.match(/href="(\/product\/([^"/]+)\/(\d+)\/[^"]*)"/i);
    const img = block.match(
      /src="((?:https?:)?\/\/[^"]+\/web\/product\/(?:big|medium|small)\/[^"]+)"/i
    );
    const price = block.match(/([\d,]+)원|&#8361;([\d,]+)/);
    if (!href || !img) continue;
    const slug = decodeURIComponent(href[2]);
    items.push({
      productNo: href[3],
      slug,
      label: slug,
      image: img[1],
      price: Number((price?.[1] || price?.[2] || "0").replace(/,/g, "")),
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
      productNo: no[1],
      slug: label,
      label,
      image: img[1],
      price: Number((price?.[1] || price?.[2] || "0").replace(/,/g, "")),
    });
  }
  return items;
}

async function scrapeLmood() {
  const map = new Map();
  const urls = [];
  for (let cate = 130; cate <= 360; cate++) {
    urls.push(`https://lmood.co.kr/product/list.html?cate_no=${cate}`);
    urls.push(`https://lmood.co.kr/product/list.html?cate_no=${cate}&page=2`);
  }
  urls.push(
    "https://lmood.co.kr/category/season-off/348/",
    "https://lmood.co.kr/category/season-off/348/?page=2",
    "https://lmood.co.kr/category/season-off/348/?page=3",
    `https://lmood.co.kr/product/search.html?keyword=${encodeURIComponent("벨트")}`,
    `https://lmood.co.kr/product/search.html?keyword=${encodeURIComponent("백")}`,
    `https://lmood.co.kr/product/search.html?keyword=${encodeURIComponent("캡")}`
  );
  let rank = 0;
  for (const url of urls) {
    const { status, body } = await get(url);
    if (status !== 200) continue;
    for (const item of parseCafe24Anchor(body)) {
      if (/^w-|^W-|\(w\)/i.test(item.slug)) continue;
      if (item.price <= 0) continue;
      const category = classify(item.label);
      if (!category) continue;
      if (!map.has(item.productNo)) {
        map.set(item.productNo, {
          ...item,
          category,
          brandKey: "lmood",
          rank: rank++,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.rank - b.rank);
}

async function scrapeKnitted() {
  const map = new Map();
  let rank = 0;
  for (const cate of [1001, 1002, 1003, 1004, 1006, 1016, 1040]) {
    for (const page of [1, 2, 3, 4]) {
      const { status, body } = await get(
        `https://knitted.co.kr/product/list.html?cate_no=${cate}&page=${page}`
      );
      if (status !== 200) continue;
      for (const item of parseCafe24Anchor(body)) {
        if (item.price <= 0) continue;
        const category = classify(item.label) || "니트";
        if (!map.has(item.productNo)) {
          map.set(item.productNo, {
            ...item,
            category,
            brandKey: "knitted",
            rank: rank++,
          });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => a.rank - b.rank);
}

async function scrapeDrawfit() {
  const map = new Map();
  let rank = 0;
  const cates = [
    42, 43, 44, 45, 49, 59, 61, 64, 67, 76, 77, 85, 100, 101, 104, 105, 210,
    211, 212, 269, 271, 272, 273, 274, 275, 276, 277, 279, 280, 281,
  ];
  for (const cate of cates) {
    const { status, body } = await get(
      `https://draw-fit.com/product/list.html?cate_no=${cate}`
    );
    if (status !== 200) continue;
    for (const item of parseDrawfit(body)) {
      if (item.price <= 0) continue;
      const category = classify(item.label);
      if (!category) continue;
      if (!map.has(item.productNo)) {
        map.set(item.productNo, {
          ...item,
          category,
          brandKey: "drawfit",
          rank: rank++,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.rank - b.rank);
}

function pickForCategory(allByBrand, category, perBrand, targetTotal) {
  const picked = [];
  const used = new Set(); // brandKey:productNo
  const usedStyles = new Set();

  const itemStyle = (item) =>
    styleKey(item.label || item.slug || "") ||
    `${item.brandKey}-${item.productNo}`;

  const take = (brandKey, limit) => {
    const list = allByBrand[brandKey].filter((p) => p.category === category);
    let n = 0;
    for (const item of list) {
      if (n >= limit) break;
      const key = `${brandKey}:${item.productNo}`;
      const sk = itemStyle({ ...item, brandKey });
      if (used.has(key) || usedStyles.has(sk)) continue;
      used.add(key);
      usedStyles.add(sk);
      picked.push({ ...item, brandKey });
      n += 1;
    }
    return n;
  };

  for (const brandKey of ["lmood", "knitted", "drawfit"]) {
    const got = take(brandKey, perBrand);
    console.log(`  ${brandKey}: ${got}`);
  }

  // Fill remaining slots ONLY from same category (any brand), unique styles
  if (picked.length < targetTotal) {
    const pool = [];
    for (const brandKey of ["lmood", "knitted", "drawfit"]) {
      for (const item of allByBrand[brandKey]) {
        if (item.category !== category) continue;
        const key = `${brandKey}:${item.productNo}`;
        if (used.has(key)) continue;
        pool.push({ ...item, brandKey });
      }
    }
    pool.sort((a, b) => a.rank - b.rank);
    for (const item of pool) {
      if (picked.length >= targetTotal) break;
      const key = `${item.brandKey}:${item.productNo}`;
      const sk = itemStyle(item);
      if (used.has(key) || usedStyles.has(sk)) continue;
      used.add(key);
      usedStyles.add(sk);
      picked.push(item);
    }
  }

  return picked.slice(0, targetTotal);
}

function noPeopleImage(category, index) {
  const list = NO_PEOPLE_IMAGES[category] || NO_PEOPLE_IMAGES.셔츠;
  return list[index % list.length];
}

async function ensureBrand({ name, slug, commissionRate }) {
  let doc = await Brand.findOne({
    $or: [{ slug }, { name: new RegExp(name.split("(")[0].trim(), "i") }],
  });
  if (doc) {
    doc.name = name;
    doc.slug = slug;
    doc.commissionRate = commissionRate;
    doc.isActive = true;
    await doc.save();
    return doc;
  }
  return Brand.create({ name, slug, commissionRate, isActive: true });
}

async function clearBrands(brandIds) {
  const products = await Product.find({ brand: { $in: brandIds } }).select("_id");
  const ids = products.map((p) => p._id);
  if (!ids.length) return 0;
  await ProductVariant.deleteMany({ product: { $in: ids } });
  await Cart.updateMany({}, { $pull: { items: { product: { $in: ids } } } });
  await Wishlist.updateMany(
    {},
    { $pull: { items: { product: { $in: ids } } } }
  );
  const r = await Product.deleteMany({ _id: { $in: ids } });
  return r.deletedCount;
}

async function createOne(brand, item, sku) {
  const colorKo = colorFromLabel(item.label || item.slug);
  const name = displayNameFromLabel(item.label || item.slug, colorKo);
  const price = Math.round(Number(item.price) / 100);
  if (!price) return false;

  const imageUrl = await resolveOfficialImage(item.image);
  if (!imageUrl) return false;

  const exists = await Product.findOne({ sku });
  if (exists) return false;

  const product = await Product.create({
    brand: brand._id,
    category: item.category,
    name,
    sku,
    price,
    discountRate: 0,
    description: `${brand.name} 공식몰 상품 #${item.productNo}`,
    images: [{ url: imageUrl, type: "main", order: 0 }],
    shippingOrigin: "국내",
    commissionRate: brand.commissionRate ?? 0,
    status: "published",
  });

  await ProductVariant.insertMany(
    SIZES.map((size) => ({
      product: product._id,
      color: colorKo,
      size,
      stock: 5,
      sku: `${sku}-${colorKo.slice(0, 2)}-${size}`
        .replace(/\s/g, "")
        .toUpperCase(),
    }))
  );
  product.totalStock = SIZES.length * 5;
  await product.save();
  return true;
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const brands = {
    lmood: await ensureBrand({
      name: "엘무드(LMOOD)",
      slug: "lmood",
      commissionRate: 0,
    }),
    knitted: await ensureBrand({
      name: "니티드(KNITTED)",
      slug: "knitted",
      commissionRate: 20,
    }),
    drawfit: await ensureBrand({
      name: "드로우핏(DRAW-FIT)",
      slug: "draw-fit",
      commissionRate: 20,
    }),
  };

  console.log("clearing old products...");
  console.log(
    "removed",
    await clearBrands([
      brands.lmood._id,
      brands.knitted._id,
      brands.drawfit._id,
    ])
  );

  console.log("scraping lmood...");
  const lmood = await scrapeLmood();
  console.log("scraping knitted...");
  const knitted = await scrapeKnitted();
  console.log("scraping drawfit...");
  const drawfit = await scrapeDrawfit();

  const allByBrand = { lmood, knitted, drawfit };
  for (const [k, v] of Object.entries(allByBrand)) {
    const counts = Object.fromEntries(
      CATEGORIES.map((c) => [c, v.filter((p) => p.category === c).length])
    );
    console.log(k, "total", v.length, counts);
  }

  const prefix = { lmood: "LMOOD", knitted: "KNITTED", drawfit: "DRAWFIT" };
  let created = 0;

  for (const category of CATEGORIES) {
    console.log(`\n=== ${category} (target 30) ===`);
    const selected = pickForCategory(
      allByBrand,
      category,
      PER_BRAND,
      PER_BRAND * 3
    );
    console.log(`  selected ${selected.length}`);

    for (const item of selected) {
      const skuFinal = `${prefix[item.brandKey]}-${item.productNo}`;
      const ok = await createOne(brands[item.brandKey], item, skuFinal);
      if (ok) {
        created += 1;
        console.log(`  + ${skuFinal} ${(item.label || "").slice(0, 40)}`);
      } else {
        console.log(`  ! skip ${skuFinal}`);
      }
    }
  }

  console.log("\ncreated total", created);
  for (const [key, brand] of Object.entries(brands)) {
    const n = await Product.countDocuments({ brand: brand._id });
    console.log(brand.name, n);
  }
  for (const category of CATEGORIES) {
    const n = await Product.countDocuments({
      brand: { $in: Object.values(brands).map((b) => b._id) },
      category,
    });
    console.log("cat", category, n);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

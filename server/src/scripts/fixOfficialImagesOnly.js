/**
 * Replace ALL product images for LMOOD / KNITTED / DRAW-FIT
 * with official CDN images only (no Unsplash).
 *
 * Run: node src/scripts/fixOfficialImagesOnly.js
 */
require("dotenv").config();
const { resolveMongoUri } = require("../config/mongoUri");
const https = require("https");
const mongoose = require("mongoose");

const Brand = require("../models/Brand");
const Product = require("../models/Product");

const MONGODB_URI = resolveMongoUri();

const HOST = {
  lmood: "https://lmood.co.kr",
  knitted: "https://knitted.co.kr",
  drawfit: "https://draw-fit.com",
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

async function resolveWorking(raw, origin) {
  if (!raw) return "";
  let image = raw;
  if (image.startsWith("//")) image = "https:" + image;
  if (image.startsWith("/")) image = origin + image;
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

function extractImages(html, origin) {
  const urls = [];
  const re =
    /(?:src|data-src)="((?:https?:)?\/\/[^"]+\/web\/product\/(?:big|medium|small)\/[^"]+|\/web\/product\/(?:big|medium|small)\/[^"]+)"/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (u.startsWith("//")) u = "https:" + u;
    if (u.startsWith("/")) u = origin + u;
    if (!urls.includes(u)) urls.push(u);
  }
  return urls;
}

async function fetchOfficialImage(brandKey, productNo) {
  const origin = HOST[brandKey];
  if (!origin || !productNo) return "";

  const candidates = [
    `${origin}/product/detail.html?product_no=${productNo}`,
    `${origin}/product/detail.html?product_no=${productNo}&cate_no=1`,
  ];

  for (const url of candidates) {
    const { status, body } = await get(url);
    if (status !== 200) continue;
    const imgs = extractImages(body, origin);
    for (const img of imgs) {
      const ok = await resolveWorking(img, origin);
      if (ok) return ok;
    }
  }

  // list search fallback via product_no in list pages is hard; try cafe24 mobile thumb pattern skip
  return "";
}

function brandKeyFromDoc(brand) {
  const slug = brand.slug || "";
  const name = brand.name || "";
  if (slug === "lmood" || /엘무드|LMOOD/i.test(name)) return "lmood";
  if (slug === "knitted" || /니티드|KNITTED/i.test(name)) return "knitted";
  if (slug === "draw-fit" || /드로우핏|DRAW/i.test(name)) return "drawfit";
  return "";
}

function productNoFromSku(sku) {
  const m = String(sku || "").match(/(\d+)$/);
  return m ? m[1] : "";
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

  const products = await Product.find({
    brand: { $in: brands.map((b) => b._id) },
  });

  let fixed = 0;
  let failed = 0;

  for (const product of products) {
    const brand = brandMap.get(String(product.brand));
    const key = brandKeyFromDoc(brand || {});
    const productNo = productNoFromSku(product.sku);
    const current = product.images?.[0]?.url || "";

    // already official?
    const isOfficial =
      /lmood\.co\.kr|knitted\.co\.kr|draw-fit\.com/i.test(current) &&
      !/unsplash/i.test(current);

    if (isOfficial && (await checkImage(current))) {
      console.log("ok", product.sku);
      continue;
    }

    const official = await fetchOfficialImage(key, productNo);
    if (!official) {
      failed += 1;
      console.log("FAIL", product.sku, key, productNo);
      continue;
    }

    product.images = [{ url: official, type: "main", order: 0 }];
    product.markModified("images");
    product.description = `${brand?.name || ""} 공식몰 상품 #${productNo}`.trim();
    await product.save();
    fixed += 1;
    console.log("fixed", product.sku, "←", official.slice(-55));
  }

  console.log(`\ndone. fixed=${fixed} failed=${failed} total=${products.length}`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

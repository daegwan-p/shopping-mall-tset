/**
 * Re-sync product names + variant colors from official brand detail pages,
 * then line-dedupe (npm run fix:dedupe).
 *
 * Run: node src/scripts/fixNamesAndColors.js
 */
require("dotenv").config();
const { resolveMongoUri } = require("../config/mongoUri");
const https = require("https");
const mongoose = require("mongoose");

const Brand = require("../models/Brand");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const {
  colorFromLabel,
  displayNameFromLabel,
} = require("../utils/styleKey");

const MONGODB_URI = resolveMongoUri();

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

function brandKeyFrom(brand) {
  const slug = brand?.slug || "";
  if (slug === "lmood") return "lmood";
  if (slug === "knitted") return "knitted";
  if (slug === "draw-fit") return "drawfit";
  return "";
}

function extractOfficialLabel(html) {
  const patterns = [
    /class="headingArea"[\s\S]*?<h1[^>]*>([^<]+)/i,
    /class="name"[^>]*>\s*(?:<span[^>]*>)?([^<]+)/i,
    /property="og:title"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:title"/i,
    /class="[^"]*(?:BigImage|big)[^"]*"[^>]*alt="([^"]+)"/i,
    /alt="([^"]+)"[^>]*class="[^"]*(?:BigImage|big)/i,
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
  const can = html.match(
    /rel="canonical"[^>]*href="[^"]*\/product\/([^/]+)\/\d+/i
  );
  if (can?.[1]) return decodeURIComponent(can[1]);
  return "";
}

function extractColorOption(html) {
  const brackets = [...html.matchAll(/\[([A-Za-z][A-Za-z .]{0,40})\]/g)].map(
    (m) => m[1].trim()
  );
  for (const b of brackets) {
    const mapped = colorFromLabel(`[${b}]`);
    if (mapped && mapped !== "블랙") return b;
  }
  if (brackets[0]) return brackets[0];
  return "";
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  const brands = await Brand.find({
    slug: { $in: ["lmood", "knitted", "draw-fit"] },
  });
  const brandMap = new Map(brands.map((b) => [String(b._id), b]));

  const products = await Product.find({
    brand: { $in: brands.map((b) => b._id) },
  }).sort({ sku: 1 });

  let updated = 0;
  let failed = 0;

  for (const product of products) {
    const brand = brandMap.get(String(product.brand));
    const brandKey = brandKeyFrom(brand);
    const productNo = String(product.sku || "").match(/(\d+)$/)?.[1];
    const origin = HOST[brandKey];
    if (!origin || !productNo) {
      failed += 1;
      continue;
    }

    const { status, body } = await getHtml(
      `${origin}/product/detail.html?product_no=${productNo}`
    );
    if (status !== 200) {
      failed += 1;
      console.log("! fetch", product.sku, status);
      continue;
    }

    let label = extractOfficialLabel(body);
    const colorHint = extractColorOption(body);
    if (!label) {
      // fallback: keep cleaning current name via display helper using sku-ish label
      label = product.name;
    }
    // Prefer bracket color from page if label lacks it
    if (colorHint && !/\[[^\]]+\]/.test(label)) {
      if (/^[A-Z]/.test(colorHint) || /[가-힣]/.test(colorHint)) {
        label = `${label} [${colorHint.replace(/[\[\]]/g, "")}]`;
      }
    }

    const color = colorFromLabel(label);
    const name = displayNameFromLabel(label, color);

    const oldName = product.name;
    const variants = await ProductVariant.find({ product: product._id });
    const oldColor = variants[0]?.color;

    product.name = name;
    await product.save();

    if (variants.length) {
      await ProductVariant.updateMany(
        { product: product._id },
        { $set: { color } }
      );
      // refresh variant skus lightly
      for (const v of variants) {
        const size = v.size;
        v.color = color;
        v.sku = `${product.sku}-${color.slice(0, 2)}-${size}`
          .replace(/\s/g, "")
          .toUpperCase();
        await v.save();
      }
    }

    updated += 1;
    if (oldName !== name || oldColor !== color) {
      console.log(
        "fix",
        product.sku,
        `\n  name: ${oldName} → ${name}`,
        oldColor !== color ? `\n  color: ${oldColor} → ${color}` : ""
      );
    }
  }

  console.log("updated", updated, "failed", failed);
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

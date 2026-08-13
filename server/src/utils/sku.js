/** Keep in sync with client/src/utils/sku.js (shared category/color codes). */
const CATEGORY_CODES = {
  아우터: "OTR",
  상의: "TOP",
  셔츠: "SHT",
  니트: "KNT",
  팬츠: "PNT",
  액세서리: "ACC",
};

const COLOR_CODES = {
  블랙: "BLK",
  화이트: "WHT",
  네이비: "NVY",
  그레이: "GRY",
  베이지: "BEG",
  브라운: "BRN",
  카키: "KHK",
  레드: "RED",
  블루: "BLU",
  그린: "GRN",
  에크루: "ECR",
  아이보리: "IVY",
};

function slugCode(value, max = 6) {
  if (!value) return "";
  const ascii = String(value)
    .normalize("NFKD")
    .replace(/[^\w]+/g, "")
    .toUpperCase();
  return ascii.slice(0, max);
}

function hashCode(value, prefix = "", length = 5) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return `${prefix}${hash.toString(36).toUpperCase().slice(0, length)}`;
}

function brandCode(brandName, brandSlug) {
  const fromSlug = slugCode(brandSlug, 6);
  if (fromSlug) return fromSlug;
  const fromName = slugCode(brandName, 6);
  if (fromName) return fromName;
  return hashCode(brandName, "B", 5);
}

function shortId(length = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function colorCode(color) {
  if (!color) return "CLR";
  if (COLOR_CODES[color]) return COLOR_CODES[color];
  const ascii = slugCode(color, 4);
  if (ascii) return ascii;
  return hashCode(color, "C", 3);
}

function sizeCode(size) {
  return String(size || "OS")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function buildProductSku({ brandName, brandSlug, category, customSku }) {
  if (customSku && String(customSku).trim()) {
    return String(customSku).trim().toUpperCase();
  }

  const brand = brandCode(brandName, brandSlug);
  const cat = CATEGORY_CODES[category] || slugCode(category, 3) || "GEN";
  return `${brand}-${cat}-${shortId(4)}`;
}

function buildVariantSku({ productSku, color, size, customSku }) {
  if (customSku && String(customSku).trim()) {
    return String(customSku).trim().toUpperCase();
  }
  const base = String(productSku || "PROD").trim().toUpperCase();
  return `${base}-${colorCode(color)}-${sizeCode(size)}`;
}

async function ensureUniqueSku(Model, baseSku, field = "sku", excludeId = null) {
  let candidate = baseSku;
  let attempt = 0;

  while (attempt < 20) {
    const query = { [field]: candidate };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Model.exists(query);
    if (!exists) return candidate;
    attempt += 1;
    candidate = `${baseSku}-${shortId(2)}`;
  }

  return `${baseSku}-${Date.now().toString(36).toUpperCase()}`;
}

module.exports = {
  CATEGORY_CODES,
  COLOR_CODES,
  slugCode,
  brandCode,
  colorCode,
  sizeCode,
  buildProductSku,
  buildVariantSku,
  ensureUniqueSku,
};

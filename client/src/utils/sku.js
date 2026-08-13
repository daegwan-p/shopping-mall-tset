/** Keep in sync with server/src/utils/sku.js (shared category/color codes). */
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

/** 미리보기용. 실제 저장 시 서버가 유니크 보장하며 생성합니다. */
export function previewProductSku({ brandName, brandSlug, category, customSku }) {
  if (customSku?.trim()) return customSku.trim().toUpperCase();
  const brand = brandCode(brandName, brandSlug);
  const cat = CATEGORY_CODES[category] || slugCode(category, 3) || "GEN";
  return `${brand}-${cat}-****`;
}

export function previewVariantSku({ productSku, color, size }) {
  const base = (productSku || "PROD").trim().toUpperCase();
  return `${base}-${colorCode(color)}-${sizeCode(size)}`;
}

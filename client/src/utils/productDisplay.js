export const COLOR_SWATCHES = {
  블랙: "#111111",
  화이트: "#f4f4f4",
  네이비: "#1f2a44",
  그레이: "#8a8a8a",
  차콜: "#3d3d3d",
  베이지: "#d6c3a5",
  브라운: "#6b4a2f",
  카키: "#6b6b3d",
  레드: "#a33",
  블루: "#3a5f8a",
  그린: "#3f6b4f",
  에크루: "#e8e0d0",
  아이보리: "#f3efe6",
  올리브: "#6b6b3d",
  로즈: "#c4878e",
  버터: "#f0e0b2",
  오트밀: "#d9d0c0",
  버건디: "#6e1f2c",
  클라우드: "#dfe3e8",
  스위스: "#cfc6b8",
};

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];

export function getMainImage(product) {
  const images = product?.images || [];
  const main = images.find((img) => img.type === "main");
  return main?.url || images[0]?.url || "";
}

export function getImageByType(product, type, fallbackTypes = ["main"]) {
  const images = product?.images || [];
  const found = images.find((img) => img.type === type);
  if (found?.url) return found.url;
  for (const fallback of fallbackTypes) {
    const next = images.find((img) => img.type === fallback);
    if (next?.url) return next.url;
  }
  return images[0]?.url || "";
}

export function getProductImages(product) {
  const images = [...(product?.images || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  if (images.length > 0) return images;
  return [];
}

export function salePrice(product) {
  const price = Number(product?.price) || 0;
  const rate = Number(product?.discountRate) || 0;
  return Math.round(price * (1 - rate / 100));
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

export const PRODUCT_STATUS_LABEL = {
  draft: "임시저장",
  published: "판매중",
  archived: "보관",
};

export function productStatusLabel(status) {
  return PRODUCT_STATUS_LABEL[status] || status;
}

export function uniqueColors(variants = []) {
  return [...new Set(variants.map((item) => item.color).filter(Boolean))];
}

export function uniqueSizes(variants = []) {
  const order = SIZE_OPTIONS;
  const sizes = [...new Set(variants.map((item) => item.size).filter(Boolean))];
  return sizes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export function stockFor(variants, color, size) {
  const found = variants.find(
    (item) => item.color === color && item.size === size
  );
  return found?.stock ?? 0;
}

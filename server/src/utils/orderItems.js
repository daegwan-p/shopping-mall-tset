const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");

const FREE_SHIPPING_THRESHOLD = 100000;
const STANDARD_SHIPPING_FEE = 3000;
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

function itemsFingerprint(items = []) {
  return items
    .map((item) => {
      const variantId = String(item.variant?._id || item.variant || "");
      const quantity = Number(item.quantity) || 0;
      return `${variantId}:${quantity}`;
    })
    .filter((part) => !part.startsWith(":"))
    .sort()
    .join("|");
}

function calcShippingFee(itemsTotal) {
  if (itemsTotal <= 0) return 0;
  if (itemsTotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING_FEE;
}

function salePrice(product) {
  const price = Number(product?.price) || 0;
  const rate = Number(product?.discountRate) || 0;
  return Math.round(price * (1 - rate / 100));
}

/**
 * 클라이언트 가격을 믿지 않고 DB 상품/옵션 기준으로 주문 라인을 재구성합니다.
 */
async function buildVerifiedOrderItems(rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const error = new Error("주문 상품이 필요합니다.");
    error.statusCode = 400;
    throw error;
  }

  const normalized = [];

  for (const raw of rawItems) {
    const variantId = raw.variant;
    const quantity = Math.max(1, Number(raw.quantity) || 1);

    if (!variantId) {
      const error = new Error("주문 상품에 옵션(variant) 정보가 필요합니다.");
      error.statusCode = 400;
      throw error;
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      const error = new Error("존재하지 않는 상품 옵션입니다.");
      error.statusCode = 400;
      throw error;
    }

    if (variant.stock < quantity) {
      const error = new Error(
        `재고가 부족합니다: ${raw.productName || "상품"} (${variant.color}/${variant.size})`
      );
      error.statusCode = 400;
      throw error;
    }

    const product = await Product.findById(variant.product).populate(
      "brand",
      "name"
    );
    if (!product || product.status !== "published") {
      const error = new Error("판매 중이 아닌 상품이 포함되어 있습니다.");
      error.statusCode = 400;
      throw error;
    }

    if (raw.product && String(raw.product) !== String(product._id)) {
      const error = new Error("상품과 옵션 정보가 일치하지 않습니다.");
      error.statusCode = 400;
      throw error;
    }

    const mainImage =
      (product.images || []).find((img) => img.type === "main")?.url ||
      product.images?.[0]?.url ||
      raw.image ||
      "";

    normalized.push({
      product: product._id,
      variant: variant._id,
      brandName: product.brand?.name || raw.brandName || "ODEUM",
      productName: product.name,
      color: variant.color,
      size: variant.size,
      quantity,
      price: salePrice(product),
      image: mainImage,
    });
  }

  return normalized;
}

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  DUPLICATE_WINDOW_MS,
  itemsFingerprint,
  calcShippingFee,
  buildVerifiedOrderItems,
};

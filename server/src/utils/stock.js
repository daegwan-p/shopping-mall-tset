const ProductVariant = require("../models/ProductVariant");

async function decrementStock(items) {
  const decremented = [];

  try {
    for (const item of items) {
      const variantId = item.variant;
      const quantity = Number(item.quantity) || 0;

      if (!variantId || quantity < 1) {
        const error = new Error("주문 상품에 옵션(variant) 정보가 필요합니다.");
        error.statusCode = 400;
        throw error;
      }

      const updated = await ProductVariant.findOneAndUpdate(
        { _id: variantId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updated) {
        const error = new Error(
          `재고가 부족합니다: ${item.productName || "상품"} (${item.color || ""}/${item.size || ""})`
        );
        error.statusCode = 400;
        throw error;
      }

      decremented.push({ variantId, quantity });
    }

    return decremented;
  } catch (error) {
    await restoreStock(
      decremented.map((item) => ({
        variant: item.variantId,
        quantity: item.quantity,
      }))
    );
    throw error;
  }
}

async function restoreStock(items = []) {
  for (const item of items) {
    const variantId = item.variant?._id || item.variant;
    const quantity = Number(item.quantity) || 0;
    if (!variantId || quantity < 1) continue;

    await ProductVariant.findByIdAndUpdate(variantId, {
      $inc: { stock: quantity },
    });
  }
}

async function assertStockAvailable(items = []) {
  for (const item of items) {
    const variantId = item.variant;
    const quantity = Number(item.quantity) || 0;

    if (!variantId || quantity < 1) {
      const error = new Error("주문 상품에 옵션(variant) 정보가 필요합니다.");
      error.statusCode = 400;
      throw error;
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant || variant.stock < quantity) {
      const error = new Error(
        `재고가 부족합니다: ${item.productName || "상품"} (${item.color || ""}/${item.size || ""})`
      );
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = {
  decrementStock,
  restoreStock,
  assertStockAvailable,
};

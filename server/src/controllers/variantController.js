const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const { syncTotalStock } = require("./productController");
const { buildVariantSku, ensureUniqueSku } = require("../utils/sku");

const getVariantsByProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    const variants = await ProductVariant.find({ product: req.params.productId }).sort({
      color: 1,
      size: 1,
    });

    res.status(200).json({ success: true, variants });
  } catch (error) {
    next(error);
  }
};

const createVariant = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { color, size, stock, sku: customSku } = req.body;

    if (!color || !size) {
      return res.status(400).json({
        success: false,
        message: "color와 size는 필수입니다.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    const baseSku = buildVariantSku({
      productSku: product.sku,
      color,
      size,
      customSku,
    });
    const sku = await ensureUniqueSku(ProductVariant, baseSku);

    const variant = await ProductVariant.create({
      product: productId,
      color,
      size,
      stock,
      sku,
    });

    await syncTotalStock(productId);

    res.status(201).json({ success: true, variant });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 존재하는 옵션(색상/사이즈)이거나 SKU입니다.",
      });
    }
    next(error);
  }
};

const updateVariant = async (req, res, next) => {
  try {
    if (req.body.sku) {
      req.body.sku = String(req.body.sku).trim().toUpperCase();
    }

    const variant = await ProductVariant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!variant) {
      return res.status(404).json({ success: false, message: "옵션을 찾을 수 없습니다." });
    }

    await syncTotalStock(variant.product);

    res.status(200).json({ success: true, variant });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 존재하는 옵션(색상/사이즈)이거나 SKU입니다.",
      });
    }
    next(error);
  }
};

const deleteVariant = async (req, res, next) => {
  try {
    const variant = await ProductVariant.findByIdAndDelete(req.params.id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "옵션을 찾을 수 없습니다." });
    }

    await syncTotalStock(variant.product);

    res.status(200).json({ success: true, message: "옵션이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVariantsByProduct,
  createVariant,
  updateVariant,
  deleteVariant,
};

const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Brand = require("../models/Brand");
const {
  buildProductSku,
  buildVariantSku,
  ensureUniqueSku,
} = require("../utils/sku");
const { parsePagination, buildPagination } = require("../utils/pagination");

const syncTotalStock = async (productId) => {
  const variants = await ProductVariant.find({ product: productId });
  const totalStock = variants.reduce((sum, item) => sum + item.stock, 0);
  await Product.findByIdAndUpdate(productId, { totalStock });
  return totalStock;
};

const getProducts = async (req, res, next) => {
  try {
    const filter = {};
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      filter.status = "published";
    } else if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: "i" } },
        { sku: { $regex: req.query.q, $options: "i" } },
      ];
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    if (req.query.color || req.query.size) {
      const variantFilter = { stock: { $gt: 0 } };
      if (req.query.color) variantFilter.color = req.query.color;
      if (req.query.size) variantFilter.size = req.query.size;
      const productIds = await ProductVariant.distinct("product", variantFilter);
      filter._id = { $in: productIds };
    }

    let sort = { createdAt: -1 };
    if (req.query.sort === "price_asc") sort = { price: 1 };
    if (req.query.sort === "price_desc") sort = { price: -1 };
    if (req.query.sort === "popular") sort = { totalStock: -1, createdAt: -1 };

    const { page, limit } = parsePagination(req.query, {
      defaultLimit: isAdmin ? 10 : 12,
    });

    const total = await Product.countDocuments(filter);
    const pagination = buildPagination(total, page, limit);
    const safeSkip = (pagination.page - 1) * limit;

    const products = await Product.find(filter)
      .populate("brand", "name commissionRate")
      .sort(sort)
      .skip(safeSkip)
      .limit(limit);

    const ids = products.map((item) => item._id);
    const variants = await ProductVariant.find({ product: { $in: ids } });
    const variantMap = {};
    variants.forEach((item) => {
      const key = String(item.product);
      if (!variantMap[key]) variantMap[key] = [];
      variantMap[key].push(item);
    });

    const productsWithVariants = products.map((item) => {
      const doc = item.toObject();
      doc.variants = variantMap[String(item._id)] || [];
      return doc;
    });

    res.status(200).json({
      success: true,
      products: productsWithVariants,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "brand",
      "name commissionRate slug"
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    if (product.status !== "published" && req.user?.role !== "admin") {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    const variants = await ProductVariant.find({ product: product._id }).sort({
      color: 1,
      size: 1,
    });

    res.status(200).json({ success: true, product, variants });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      brand,
      category,
      name,
      sku: customSku,
      price,
      discountRate,
      description,
      images,
      shippingOrigin,
      commissionRate,
      status,
      variants = [],
    } = req.body;

    if (!brand || !category || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "brand, category, name, price는 필수입니다.",
      });
    }

    const brandDoc = await Brand.findById(brand);
    if (!brandDoc) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 브랜드입니다.",
      });
    }

    const baseSku = buildProductSku({
      brandName: brandDoc.name,
      brandSlug: brandDoc.slug,
      category,
      customSku,
    });
    const sku = await ensureUniqueSku(Product, baseSku);

    const product = await Product.create({
      brand,
      category,
      name,
      sku,
      price,
      discountRate,
      description,
      images,
      shippingOrigin,
      commissionRate,
      status,
    });

    if (Array.isArray(variants) && variants.length > 0) {
      const docs = [];
      for (const item of variants) {
        const variantBase = buildVariantSku({
          productSku: sku,
          color: item.color,
          size: item.size,
          customSku: item.sku,
        });
        const variantSku = await ensureUniqueSku(ProductVariant, variantBase);
        docs.push({
          product: product._id,
          color: item.color,
          size: item.size,
          stock: item.stock ?? 0,
          sku: variantSku,
        });
      }
      await ProductVariant.insertMany(docs);
      await syncTotalStock(product._id);
    }

    const created = await Product.findById(product._id).populate(
      "brand",
      "name commissionRate"
    );
    const createdVariants = await ProductVariant.find({ product: product._id });

    res.status(201).json({
      success: true,
      product: created,
      variants: createdVariants,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 사용 중인 SKU입니다. 다른 SKU를 입력해 주세요.",
      });
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { variants, ...productFields } = req.body;

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "상품을 찾을 수 없습니다.",
      });
    }

    const brandId = productFields.brand || existingProduct.brand;
    const brandDoc = await Brand.findById(brandId);
    if (!brandDoc) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 브랜드입니다.",
      });
    }

    const category = productFields.category || existingProduct.category;
    const incomingSku = productFields.sku
      ? String(productFields.sku).trim().toUpperCase()
      : "";

    if (incomingSku) {
      // 사용자가 직접 입력/변경한 경우만 갱신 (본인 SKU는 중복으로 보지 않음)
      productFields.sku = await ensureUniqueSku(
        Product,
        incomingSku,
        "sku",
        existingProduct._id
      );
    } else if (existingProduct.sku) {
      // 이미 SKU가 있으면 유지 (매 수정마다 재생성하지 않음)
      delete productFields.sku;
    } else {
      // 예전 상품처럼 SKU가 없을 때만 한 번 자동 생성
      const baseSku = buildProductSku({
        brandName: brandDoc.name,
        brandSlug: brandDoc.slug,
        category,
        customSku: "",
      });
      productFields.sku = await ensureUniqueSku(
        Product,
        baseSku,
        "sku",
        existingProduct._id
      );
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productFields,
      {
        new: true,
        runValidators: true,
      }
    ).populate("brand", "name commissionRate slug");

    if (Array.isArray(variants)) {
      const existing = await ProductVariant.find({ product: product._id });
      const skuByKey = Object.fromEntries(
        existing.map((item) => [`${item.color}__${item.size}`, item.sku])
      );

      await ProductVariant.deleteMany({ product: product._id });

      if (variants.length > 0) {
        const docs = [];
        for (const item of variants) {
          const key = `${item.color}__${item.size}`;
          const previousSku = skuByKey[key];
          // 기존 옵션 SKU가 있으면 유지, 없을 때만 생성
          const variantBase = previousSku
            ? previousSku
            : buildVariantSku({
                productSku: product.sku,
                color: item.color,
                size: item.size,
                customSku: item.sku,
              });
          const variantSku = await ensureUniqueSku(
            ProductVariant,
            variantBase
          );
          docs.push({
            product: product._id,
            color: item.color,
            size: item.size,
            stock: item.stock ?? 0,
            sku: variantSku,
          });
        }
        await ProductVariant.insertMany(docs);
      }

      await syncTotalStock(product._id);
    }

    const updated = await Product.findById(product._id).populate(
      "brand",
      "name commissionRate slug"
    );
    const updatedVariants = await ProductVariant.find({
      product: product._id,
    }).sort({
      color: 1,
      size: 1,
    });

    res.status(200).json({
      success: true,
      product: updated,
      variants: updatedVariants,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 사용 중인 SKU입니다. 다른 SKU를 입력해 주세요.",
      });
    }
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    await ProductVariant.deleteMany({ product: product._id });

    res.status(200).json({ success: true, message: "상품이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  syncTotalStock,
};

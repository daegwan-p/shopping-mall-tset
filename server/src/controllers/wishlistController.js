const Product = require("../models/Product");
const Wishlist = require("../models/Wishlist");

async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
  }
  return wishlist;
}

async function populateWishlistItems(wishlist) {
  await wishlist.populate({
    path: "items.product",
    populate: { path: "brand", select: "name" },
  });

  const items = (wishlist.items || [])
    .filter((item) => item.product)
    .map((item) => ({
      _id: item._id,
      productId: item.product._id,
      addedAt: item.createdAt,
      product: item.product,
    }));

  return items;
}

const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.user._id);
    const items = await populateWishlistItems(wishlist);
    res.status(200).json({
      success: true,
      items,
      productIds: items.map((item) => String(item.productId)),
    });
  } catch (error) {
    next(error);
  }
};

const getWishlistIds = async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.user._id);
    const productIds = (wishlist.items || [])
      .map((item) => String(item.product))
      .filter(Boolean);
    res.status(200).json({ success: true, productIds });
  } catch (error) {
    next(error);
  }
};

const addWishlistItem = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId는 필수입니다.",
      });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "상품을 찾을 수 없습니다.",
      });
    }

    const wishlist = await getOrCreateWishlist(req.user._id);
    const exists = wishlist.items.some(
      (item) => item.product.toString() === String(productId)
    );

    if (!exists) {
      wishlist.items.unshift({ product: productId });
      await wishlist.save();
    }

    const items = await populateWishlistItems(wishlist);
    res.status(200).json({
      success: true,
      items,
      productIds: items.map((item) => String(item.productId)),
      wished: true,
    });
  } catch (error) {
    next(error);
  }
};

const removeWishlistItem = async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const wishlist = await getOrCreateWishlist(req.user._id);
    const before = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== String(productId)
    );

    if (wishlist.items.length !== before) {
      await wishlist.save();
    }

    const items = await populateWishlistItems(wishlist);
    res.status(200).json({
      success: true,
      items,
      productIds: items.map((item) => String(item.productId)),
      wished: false,
    });
  } catch (error) {
    next(error);
  }
};

const toggleWishlistItem = async (req, res, next) => {
  try {
    const productId = req.body.productId;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId는 필수입니다.",
      });
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "상품을 찾을 수 없습니다.",
      });
    }

    const wishlist = await getOrCreateWishlist(req.user._id);
    const index = wishlist.items.findIndex(
      (item) => item.product.toString() === String(productId)
    );

    let wished;
    if (index >= 0) {
      wishlist.items.splice(index, 1);
      wished = false;
    } else {
      wishlist.items.unshift({ product: productId });
      wished = true;
    }

    await wishlist.save();
    const items = await populateWishlistItems(wishlist);
    res.status(200).json({
      success: true,
      items,
      productIds: items.map((item) => String(item.productId)),
      wished,
    });
  } catch (error) {
    next(error);
  }
};

const mergeWishlist = async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body.productIds)
      ? req.body.productIds
      : [];
    const wishlist = await getOrCreateWishlist(req.user._id);
    const existing = new Set(
      wishlist.items.map((item) => item.product.toString())
    );

    for (const productId of incoming) {
      if (!productId || existing.has(String(productId))) continue;
      const product = await Product.findById(productId).select("_id status");
      if (!product || product.status !== "published") continue;
      wishlist.items.unshift({ product: productId });
      existing.add(String(productId));
    }

    await wishlist.save();
    const items = await populateWishlistItems(wishlist);
    res.status(200).json({
      success: true,
      items,
      productIds: items.map((item) => String(item.productId)),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  getWishlistIds,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlistItem,
  mergeWishlist,
};

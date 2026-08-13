const Cart = require("../models/Cart");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");

const toClientItem = (item, stock) => ({
  _id: item._id,
  key: `${item.product}__${item.color || ""}__${item.size || ""}`,
  productId: item.product?.toString?.() || String(item.product),
  variantId: item.variant?.toString?.() || String(item.variant),
  brandName: item.brandName || "",
  productName: item.productName,
  color: item.color || "",
  size: item.size || "",
  price: item.price,
  image: item.image || "",
  quantity: item.quantity,
  selected: item.selected !== false,
  stock: typeof stock === "number" ? stock : item.quantity,
});

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

async function attachStocks(items) {
  const variantIds = items
    .map((item) => item.variant)
    .filter(Boolean)
    .map((id) => id.toString());

  if (variantIds.length === 0) {
    return items.map((item) => toClientItem(item, 0));
  }

  const variants = await ProductVariant.find({ _id: { $in: variantIds } });
  const stockMap = new Map(
    variants.map((variant) => [variant._id.toString(), variant.stock])
  );

  return items.map((item) =>
    toClientItem(item, stockMap.get(item.variant.toString()) ?? 0)
  );
}

const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const addCartItem = async (req, res, next) => {
  try {
    const {
      productId,
      variantId,
      quantity = 1,
      brandName,
      productName,
      color,
      size,
      price,
      image,
    } = req.body;

    if (!productId || !variantId) {
      return res.status(400).json({
        success: false,
        message: "productId와 variantId는 필수입니다.",
      });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant || variant.product.toString() !== String(productId)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 상품 옵션입니다.",
      });
    }

    const product = await Product.findById(productId).populate("brand", "name");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "상품을 찾을 수 없습니다.",
      });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    if (variant.stock < 1) {
      return res.status(400).json({
        success: false,
        message: "선택한 옵션은 품절입니다.",
      });
    }

    const cart = await getOrCreateCart(req.user._id);
    const existing = cart.items.find(
      (item) => item.variant.toString() === String(variantId)
    );

    if (existing) {
      existing.quantity = Math.min(
        variant.stock,
        existing.quantity + qty
      );
      existing.selected = true;
      if (price !== undefined) existing.price = Number(price) || existing.price;
      if (image) existing.image = image;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId,
        brandName: brandName || product.brand?.name || "",
        productName: productName || product.name,
        color: color || variant.color,
        size: size || variant.size,
        quantity: Math.min(variant.stock, qty),
        price: Number(price) || 0,
        image: image || "",
        selected: true,
      });
    }

    await cart.save();
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "장바구니 상품을 찾을 수 없습니다.",
      });
    }

    if (req.body.quantity !== undefined) {
      const variant = await ProductVariant.findById(item.variant);
      const stock = variant?.stock ?? 0;
      item.quantity = Math.min(
        Math.max(1, Number(req.body.quantity) || 1),
        Math.max(1, stock)
      );
    }

    if (req.body.selected !== undefined) {
      item.selected = Boolean(req.body.selected);
    }

    await cart.save();
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "장바구니 상품을 찾을 수 없습니다.",
      });
    }

    item.deleteOne();
    await cart.save();
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const setAllSelected = async (req, res, next) => {
  try {
    const selected = req.body.selected !== false;
    const cart = await getOrCreateCart(req.user._id);
    cart.items.forEach((item) => {
      item.selected = selected;
    });
    await cart.save();
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const removeSelected = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter((item) => !item.selected);
    await cart.save();
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.status(200).json({ success: true, items: [] });
  } catch (error) {
    next(error);
  }
};

const mergeCart = async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body.items) ? req.body.items : [];
    const cart = await getOrCreateCart(req.user._id);

    for (const raw of incoming) {
      if (!raw.productId || !raw.variantId) continue;

      const variant = await ProductVariant.findById(raw.variantId);
      if (!variant || variant.product.toString() !== String(raw.productId)) {
        continue;
      }

      const qty = Math.max(1, Number(raw.quantity) || 1);
      const existing = cart.items.find(
        (item) => item.variant.toString() === String(raw.variantId)
      );

      if (existing) {
        existing.quantity = Math.min(
          variant.stock || existing.quantity,
          existing.quantity + qty
        );
        existing.selected = true;
      } else if (variant.stock > 0) {
        cart.items.push({
          product: raw.productId,
          variant: raw.variantId,
          brandName: raw.brandName || "",
          productName: raw.productName || "상품",
          color: raw.color || variant.color,
          size: raw.size || variant.size,
          quantity: Math.min(variant.stock, qty),
          price: Number(raw.price) || 0,
          image: raw.image || "",
          selected: raw.selected !== false,
        });
      }
    }

    await cart.save();
    const items = await attachStocks(cart.items);
    res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

const removeVariantsFromCart = async (userId, variantIds = []) => {
  if (!variantIds.length) return;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return;

  const idSet = new Set(variantIds.map((id) => String(id)));
  cart.items = cart.items.filter(
    (item) => !idSet.has(item.variant.toString())
  );
  await cart.save();
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  setAllSelected,
  removeSelected,
  clearCart,
  mergeCart,
  removeVariantsFromCart,
};

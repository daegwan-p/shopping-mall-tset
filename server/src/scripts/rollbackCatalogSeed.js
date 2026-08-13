require("dotenv").config();
const { resolveMongoUri } = require("../config/mongoUri");
const mongoose = require("mongoose");

const Brand = require("../models/Brand");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");

const MONGODB_URI = resolveMongoUri();

async function rollback() {
  await mongoose.connect(MONGODB_URI);
  console.log("connected:", MONGODB_URI);

  const products = await Product.find({
    $or: [{ sku: /^SEED-/i }, { sku: /^LMOOD-\d{2}$/i }],
  }).select("_id sku");

  const ids = products.map((p) => p._id);
  console.log(
    "found",
    products.length,
    products.map((p) => p.sku).join(", ") || "(none)"
  );

  if (ids.length) {
    const v = await ProductVariant.deleteMany({ product: { $in: ids } });
    await Cart.updateMany({}, { $pull: { items: { product: { $in: ids } } } });
    await Wishlist.updateMany(
      {},
      { $pull: { items: { product: { $in: ids } } } }
    );
    const p = await Product.deleteMany({ _id: { $in: ids } });
    console.log(
      `deleted products=${p.deletedCount} variants=${v.deletedCount}`
    );
  }

  for (const slug of ["lmood", "covernat", "aake"]) {
    const brand = await Brand.findOne({ slug });
    if (!brand) continue;
    const left = await Product.countDocuments({ brand: brand._id });
    if (left === 0) {
      await Brand.deleteOne({ _id: brand._id });
      console.log(`removed empty brand: ${brand.name}`);
    } else {
      console.log(`kept brand ${brand.name}, remaining products: ${left}`);
    }
  }

  console.log("products left:", await Product.countDocuments());
  const brands = await Brand.find().select("name");
  console.log(
    "brands:",
    brands.map((b) => b.name).join(", ") || "(none)"
  );

  await mongoose.disconnect();
}

rollback().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

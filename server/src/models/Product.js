const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["main", "front", "back", "detail", "wear"],
      default: "main",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["아우터", "상의", "셔츠", "니트", "팬츠", "액세서리"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountRate: {
      type: Number,
      enum: [0, 10, 20, 30],
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    shippingOrigin: {
      type: String,
      default: "",
      trim: true,
    },
    commissionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    totalStock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);

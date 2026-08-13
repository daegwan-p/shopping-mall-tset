const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "",
    },
    size: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    recipient: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    detailAddress: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    memo: { type: String, default: "" },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    action: { type: String, required: true, trim: true },
    actor: { type: String, default: "System", trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending_deposit",
        "paid",
        "preparing",
        "shipping",
        "delivered",
        "cancel_requested",
        "cancelled",
      ],
      default: "pending_payment",
    },
    paymentMethod: {
      type: String,
      default: "",
      trim: true,
    },
    pgProvider: {
      type: String,
      default: "",
      trim: true,
    },
    pgImpUid: {
      type: String,
      default: "",
      trim: true,
    },
    pgMerchantUid: {
      type: String,
      default: "",
      trim: true,
    },
    paidAmount: {
      type: Number,
      min: 0,
    },
    itemsTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    userCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserCoupon",
    },
    shippingMethod: {
      type: String,
      default: "standard",
      trim: true,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    courier: {
      type: String,
      default: "",
      trim: true,
    },
    trackingNumber: {
      type: String,
      default: "",
      trim: true,
    },
    adminMemo: {
      type: String,
      default: "",
    },
    history: {
      type: [historySchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "주문 상품은 1개 이상이어야 합니다.",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({}),
    },
    paidAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    stockDeducted: {
      type: Boolean,
      default: false,
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

orderSchema.index(
  { pgImpUid: 1 },
  {
    unique: true,
    partialFilterExpression: {
      pgImpUid: { $type: "string", $gt: "" },
    },
  }
);

orderSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);

const mongoose = require("mongoose");

const userCouponSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "used", "expired"],
      default: "available",
    },
    usedAt: {
      type: Date,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  { timestamps: true }
);

userCouponSchema.index({ user: 1, coupon: 1, status: 1 });

module.exports = mongoose.model("UserCoupon", userCouponSchema);

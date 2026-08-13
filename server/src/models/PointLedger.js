const mongoose = require("mongoose");

const pointLedgerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["review_earn", "order_earn", "order_use", "coupon", "admin", "expire"],
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    refReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },
    refOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PointLedger", pointLedgerSchema);

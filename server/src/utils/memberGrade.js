const Order = require("../models/Order");

const PAID_STATUSES = ["paid", "preparing", "shipping", "delivered"];

const GRADE_TIERS = [
  { id: "VIP", min: 500000, rate: 5, next: null },
  { id: "GOLD", min: 200000, rate: 3, next: "VIP" },
  { id: "SILVER", min: 50000, rate: 2, next: "GOLD" },
  { id: "MEMBER", min: 0, rate: 1, next: "SILVER" },
];

function gradeFromSpend(totalSpend) {
  const spend = Number(totalSpend) || 0;
  const current =
    GRADE_TIERS.find((tier) => spend >= tier.min) || GRADE_TIERS.at(-1);
  const nextTier = current.next
    ? GRADE_TIERS.find((tier) => tier.id === current.next)
    : null;
  const remain = nextTier ? Math.max(0, nextTier.min - spend) : 0;
  const progress = nextTier
    ? Math.min(
        100,
        Math.round(
          ((spend - current.min) / Math.max(1, nextTier.min - current.min)) *
            100
        )
      )
    : 100;

  return {
    grade: current.id,
    rate: current.rate,
    totalSpend: spend,
    nextGrade: nextTier?.id || null,
    remainToNext: remain,
    progress,
  };
}

async function getMemberGrade(userId) {
  const orders = await Order.find({
    user: userId,
    status: { $in: PAID_STATUSES },
  }).select("totalAmount paidAmount");

  const totalSpend = orders.reduce(
    (sum, order) => sum + Number(order.paidAmount ?? order.totalAmount ?? 0),
    0
  );

  return gradeFromSpend(totalSpend);
}

module.exports = {
  GRADE_TIERS,
  gradeFromSpend,
  getMemberGrade,
};

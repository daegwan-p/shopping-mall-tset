const User = require("../models/User");
const PointLedger = require("../models/PointLedger");

async function creditPoints(userId, amount, { type, note, refReview, refOrder } = {}) {
  const value = Number(amount) || 0;
  if (value === 0) return null;

  if (value < 0) {
    const current = await User.findById(userId).select("pointBalance");
    if (!current) {
      const error = new Error("사용자를 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    if ((current.pointBalance || 0) + value < 0) {
      const error = new Error("적립금이 부족합니다.");
      error.statusCode = 400;
      throw error;
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { pointBalance: value } },
    { new: true }
  );
  if (!user) {
    const error = new Error("사용자를 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  const entry = await PointLedger.create({
    user: userId,
    amount: value,
    type,
    note: note || "",
    refReview,
    refOrder,
  });

  return { user, entry };
}

function resolvePointsToUse({
  requested,
  pointBalance,
  itemsTotal,
  couponDiscount,
  shippingFee,
}) {
  const want = Math.max(0, Math.floor(Number(requested) || 0));
  if (want === 0) return 0;

  const payable = Math.max(
    0,
    Number(itemsTotal || 0) - Number(couponDiscount || 0) + Number(shippingFee || 0)
  );
  const maxUsable = Math.min(Number(pointBalance) || 0, payable);

  if (want > maxUsable) {
    const error = new Error(
      `적립금은 최대 ${maxUsable.toLocaleString("ko-KR")}원까지 사용할 수 있습니다.`
    );
    error.statusCode = 400;
    throw error;
  }

  return want;
}

module.exports = {
  creditPoints,
  resolvePointsToUse,
};

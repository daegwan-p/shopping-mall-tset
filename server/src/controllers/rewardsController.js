const PointLedger = require("../models/PointLedger");
const UserCoupon = require("../models/UserCoupon");
const { issueCouponByCode } = require("../utils/coupons");

function formatCouponCard(userCoupon) {
  const coupon = userCoupon.coupon;
  if (!coupon) return null;

  const now = new Date();
  let status = userCoupon.status;
  if (
    status === "available" &&
    coupon.expiresAt &&
    coupon.expiresAt < now
  ) {
    status = "expired";
  }

  const daysLeft = coupon.expiresAt
    ? Math.ceil((coupon.expiresAt - now) / (24 * 60 * 60 * 1000))
    : null;

  return {
    _id: userCoupon._id,
    status,
    title: coupon.title,
    description: coupon.description,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    category: coupon.category,
    expiresAt: coupon.expiresAt,
    daysLeft,
    urgent: daysLeft != null && daysLeft >= 0 && daysLeft <= 7,
    displayValue:
      coupon.type === "percent"
        ? `${coupon.value}%`
        : `${Number(coupon.value).toLocaleString("ko-KR")}`,
  };
}

const getRewards = async (req, res, next) => {
  try {
    const userCoupons = await UserCoupon.find({ user: req.user._id })
      .populate("coupon")
      .sort({ createdAt: -1 });

    const coupons = userCoupons
      .map(formatCouponCard)
      .filter(Boolean)
      .filter((item) => item.status === "available");

    const history = await PointLedger.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      pointBalance: req.user.pointBalance || 0,
      coupons,
      couponCount: coupons.length,
      pointHistory: history.map((item) => ({
        _id: item._id,
        label: item.note || item.type,
        amount: item.amount,
        type: item.type,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const redeemCoupon = async (req, res, next) => {
  try {
    const userCoupon = await issueCouponByCode(req.user._id, req.body.code);
    const populated =
      userCoupon.coupon?.title
        ? userCoupon
        : await userCoupon.populate("coupon");

    res.status(201).json({
      success: true,
      coupon: formatCouponCard(populated),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  getRewards,
  redeemCoupon,
};

const Coupon = require("../models/Coupon");
const UserCoupon = require("../models/UserCoupon");
const {
  SIGNUP_COUPON_AMOUNT,
  SIGNUP_COUPON_CODE,
} = require("./rewardsConstants");

async function ensureSignupCoupon() {
  let coupon = await Coupon.findOne({ code: SIGNUP_COUPON_CODE });
  if (coupon) return coupon;

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  coupon = await Coupon.create({
    code: SIGNUP_COUPON_CODE,
    title: "회원가입 10,000원 할인",
    description: "신규 회원 전용 할인쿠폰",
    type: "amount",
    value: SIGNUP_COUPON_AMOUNT,
    minOrderAmount: 0,
    expiresAt,
    perUserLimit: 1,
    isActive: true,
    isSignupReward: true,
  });
  return coupon;
}

async function issueSignupCoupon(userId) {
  const coupon = await ensureSignupCoupon();
  const existing = await UserCoupon.findOne({
    user: userId,
    coupon: coupon._id,
  });
  if (existing) return existing;

  return UserCoupon.create({
    user: userId,
    coupon: coupon._id,
    status: "available",
  });
}

async function issueCouponByCode(userId, code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) {
    const error = new Error("쿠폰 코드를 입력해 주세요.");
    error.statusCode = 400;
    throw error;
  }

  const coupon = await Coupon.findOne({ code: normalized, isActive: true });
  if (!coupon) {
    const error = new Error("유효하지 않은 쿠폰 코드입니다.");
    error.statusCode = 404;
    throw error;
  }

  if (coupon.isSignupReward) {
    const error = new Error("이 쿠폰은 코드로 등록할 수 없습니다.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    const error = new Error("아직 사용할 수 없는 쿠폰입니다.");
    error.statusCode = 400;
    throw error;
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    const error = new Error("만료된 쿠폰입니다.");
    error.statusCode = 400;
    throw error;
  }
  if (
    coupon.usageLimit != null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    const error = new Error("쿠폰 발급이 마감되었습니다.");
    error.statusCode = 400;
    throw error;
  }

  const ownedCount = await UserCoupon.countDocuments({
    user: userId,
    coupon: coupon._id,
  });
  if (ownedCount >= (coupon.perUserLimit || 1)) {
    const error = new Error("이미 보유한 쿠폰입니다.");
    error.statusCode = 409;
    throw error;
  }

  const userCoupon = await UserCoupon.create({
    user: userId,
    coupon: coupon._id,
    status: "available",
  });

  return userCoupon.populate("coupon");
}

function calcCouponDiscount(coupon, itemsTotal) {
  const total = Number(itemsTotal) || 0;
  if (!coupon || total <= 0) return 0;

  if (Number(coupon.minOrderAmount || 0) > total) {
    const error = new Error(
      `이 쿠폰은 ${Number(coupon.minOrderAmount).toLocaleString("ko-KR")}원 이상 주문에 사용할 수 있습니다.`
    );
    error.statusCode = 400;
    throw error;
  }

  if (coupon.type === "percent") {
    return Math.min(total, Math.round((total * Number(coupon.value)) / 100));
  }

  return Math.min(total, Number(coupon.value) || 0);
}

async function resolveCheckoutCoupon(userId, userCouponId, itemsTotal) {
  if (!userCouponId) {
    return { couponDiscount: 0, userCoupon: null };
  }

  const userCoupon = await UserCoupon.findOne({
    _id: userCouponId,
    user: userId,
  }).populate("coupon");

  if (!userCoupon || !userCoupon.coupon) {
    const error = new Error("쿠폰을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  if (userCoupon.status !== "available") {
    const error = new Error("이미 사용되었거나 사용할 수 없는 쿠폰입니다.");
    error.statusCode = 400;
    throw error;
  }

  const coupon = userCoupon.coupon;
  const now = new Date();
  if (!coupon.isActive) {
    const error = new Error("비활성 쿠폰입니다.");
    error.statusCode = 400;
    throw error;
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    const error = new Error("만료된 쿠폰입니다.");
    error.statusCode = 400;
    throw error;
  }
  if (coupon.startsAt && coupon.startsAt > now) {
    const error = new Error("아직 사용할 수 없는 쿠폰입니다.");
    error.statusCode = 400;
    throw error;
  }

  const couponDiscount = calcCouponDiscount(coupon, itemsTotal);
  return { couponDiscount, userCoupon };
}

async function markCouponUsed(userCoupon, orderId) {
  if (!userCoupon) return;
  const id = userCoupon._id || userCoupon;
  const updated = await UserCoupon.findOneAndUpdate(
    { _id: id, status: "available" },
    {
      $set: {
        status: "used",
        usedAt: new Date(),
        order: orderId,
      },
    },
    { new: true }
  );

  if (!updated) {
    const error = new Error("쿠폰이 이미 사용되었거나 사용할 수 없습니다.");
    error.statusCode = 409;
    throw error;
  }

  const couponId = userCoupon.coupon?._id || userCoupon.coupon || updated.coupon;
  if (couponId) {
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
  }
}

async function restoreCouponForOrder(order) {
  if (!order?.userCoupon) return false;
  const userCoupon = await UserCoupon.findById(order.userCoupon);
  if (!userCoupon || userCoupon.status !== "used") return false;

  userCoupon.status = "available";
  userCoupon.usedAt = undefined;
  userCoupon.order = undefined;
  await userCoupon.save();

  if (userCoupon.coupon) {
    await Coupon.findByIdAndUpdate(userCoupon.coupon, {
      $inc: { usedCount: -1 },
    });
  }
  return true;
}

module.exports = {
  ensureSignupCoupon,
  issueSignupCoupon,
  issueCouponByCode,
  calcCouponDiscount,
  resolveCheckoutCoupon,
  markCouponUsed,
  restoreCouponForOrder,
};

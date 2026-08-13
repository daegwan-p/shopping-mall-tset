const Coupon = require("../models/Coupon");
const { ensureSignupCoupon } = require("../utils/coupons");

const getCoupons = async (req, res, next) => {
  try {
    await ensureSignupCoupon();
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    next(error);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      type,
      value,
      minOrderAmount,
      category,
      startsAt,
      expiresAt,
      usageLimit,
      perUserLimit,
      isActive,
    } = req.body;

    if (!code || !title || !type || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "code, title, type, value는 필수입니다.",
      });
    }

    if (!["percent", "amount"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type은 percent 또는 amount여야 합니다.",
      });
    }

    const coupon = await Coupon.create({
      code: String(code).trim().toUpperCase(),
      title: title.trim(),
      description: description || "",
      type,
      value: Number(value),
      minOrderAmount: Number(minOrderAmount) || 0,
      category: category || "",
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      usageLimit:
        usageLimit === "" || usageLimit == null ? null : Number(usageLimit),
      perUserLimit: Number(perUserLimit) || 1,
      isActive: isActive !== false,
    });

    res.status(201).json({ success: true, coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "이미 존재하는 쿠폰 코드입니다.",
      });
    }
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "쿠폰을 찾을 수 없습니다.",
      });
    }

    const allowed = [
      "title",
      "description",
      "type",
      "value",
      "minOrderAmount",
      "category",
      "startsAt",
      "expiresAt",
      "usageLimit",
      "perUserLimit",
      "isActive",
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === "code") return;
        if (["startsAt", "expiresAt"].includes(key)) {
          coupon[key] = req.body[key] ? new Date(req.body[key]) : coupon[key];
        } else if (key === "usageLimit") {
          coupon.usageLimit =
            req.body.usageLimit === "" || req.body.usageLimit == null
              ? null
              : Number(req.body.usageLimit);
        } else if (
          ["value", "minOrderAmount", "perUserLimit"].includes(key)
        ) {
          coupon[key] = Number(req.body[key]);
        } else {
          coupon[key] = req.body[key];
        }
      }
    });

    await coupon.save();
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    next(error);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "쿠폰을 찾을 수 없습니다.",
      });
    }
    if (coupon.isSignupReward) {
      return res.status(400).json({
        success: false,
        message: "회원가입 쿠폰은 삭제할 수 없습니다. 비활성화만 가능합니다.",
      });
    }
    await coupon.deleteOne();
    res.status(200).json({ success: true, message: "쿠폰이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};

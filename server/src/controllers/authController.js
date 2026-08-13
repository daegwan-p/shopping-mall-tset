const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { issueSignupCoupon } = require("../utils/coupons");
const { getMemberGrade } = require("../utils/memberGrade");

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

async function publicUser(user) {
  const membership = await getMemberGrade(user._id);
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    birthDate: user.birthDate || "",
    role: user.role,
    addresses: user.addresses,
    pointBalance: user.pointBalance || 0,
    marketingEmail: Boolean(user.marketingEmail),
    marketingSms: Boolean(user.marketingSms),
    marketingPush: Boolean(user.marketingPush),
    membership,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const register = async (req, res, next) => {
  try {
    const { email, password, name, phone } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "email, password, name은 필수입니다.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "비밀번호는 6자 이상이어야 합니다.",
      });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "이미 사용 중인 이메일입니다.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name,
      phone: phone || "",
      pointBalance: 0,
    });

    try {
      await issueSignupCoupon(user._id);
    } catch (couponError) {
      console.error("Signup coupon issue failed:", couponError.message);
    }

    const token = createToken(user._id);

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      token,
      user: await publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "email과 password는 필수입니다.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = createToken(user._id);

    res.status(200).json({
      success: true,
      message: "로그인 성공",
      token,
      user: await publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: await publicUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};

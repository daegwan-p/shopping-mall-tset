const bcrypt = require("bcryptjs");
const User = require("../models/User");

const { getMemberGrade } = require("../utils/memberGrade");

const updateMe = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      addresses,
      birthDate,
      marketingEmail,
      marketingSms,
      marketingPush,
    } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (addresses !== undefined) updates.addresses = addresses;
    if (birthDate !== undefined) updates.birthDate = String(birthDate).trim();
    if (marketingEmail !== undefined) {
      updates.marketingEmail = Boolean(marketingEmail);
    }
    if (marketingSms !== undefined) updates.marketingSms = Boolean(marketingSms);
    if (marketingPush !== undefined) {
      updates.marketingPush = Boolean(marketingPush);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "수정할 필드가 없습니다.",
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    const membership = await getMemberGrade(user._id);

    res.status(200).json({
      success: true,
      message: "회원 정보가 수정되었습니다.",
      user: {
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
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword와 newPassword는 필수입니다.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "새 비밀번호는 6자 이상이어야 합니다.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "현재 비밀번호가 올바르지 않습니다.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "비밀번호가 변경되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

const deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });

    res.status(200).json({
      success: true,
      message: "회원 탈퇴가 완료되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateMe,
  updatePassword,
  deleteMe,
};

const Brand = require("../models/Brand");

const getBrands = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user?.role !== "admin") {
      filter.isActive = true;
    } else if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const brands = await Brand.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, brands });
  } catch (error) {
    next(error);
  }
};

const getBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "브랜드를 찾을 수 없습니다." });
    }
    res.status(200).json({ success: true, brand });
  } catch (error) {
    next(error);
  }
};

const createBrand = async (req, res, next) => {
  try {
    const { name, slug, commissionRate, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "name은 필수입니다." });
    }

    const brand = await Brand.create({
      name,
      slug,
      commissionRate,
      isActive,
    });

    res.status(201).json({ success: true, brand });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "이미 존재하는 브랜드입니다." });
    }
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: "브랜드를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, brand });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "이미 존재하는 브랜드입니다." });
    }
    next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "브랜드를 찾을 수 없습니다." });
    }
    res.status(200).json({ success: true, message: "브랜드가 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
};

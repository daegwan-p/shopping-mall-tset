const express = require("express");
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/couponController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);
router.get("/", getCoupons);
router.post("/", createCoupon);
router.patch("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

module.exports = router;

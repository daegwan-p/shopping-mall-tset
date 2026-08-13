const express = require("express");
const { getRewards, redeemCoupon } = require("../controllers/rewardsController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/", getRewards);
router.post("/coupons/redeem", redeemCoupon);

module.exports = router;

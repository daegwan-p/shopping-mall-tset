const express = require("express");
const {
  getMyReviews,
  createReview,
  getProductReviews,
} = require("../controllers/reviewController");
const { protect, optionalProtect } = require("../middleware/auth");

const router = express.Router();

router.get("/product/:productId", optionalProtect, getProductReviews);
router.get("/mine", protect, getMyReviews);
router.post("/", protect, createReview);

module.exports = router;

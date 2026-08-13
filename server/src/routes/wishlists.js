const express = require("express");
const {
  getWishlist,
  getWishlistIds,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlistItem,
  mergeWishlist,
} = require("../controllers/wishlistController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getWishlist);
router.get("/ids", getWishlistIds);
router.post("/items", addWishlistItem);
router.post("/toggle", toggleWishlistItem);
router.post("/merge", mergeWishlist);
router.delete("/items/:productId", removeWishlistItem);

module.exports = router;

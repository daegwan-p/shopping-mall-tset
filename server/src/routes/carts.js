const express = require("express");
const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  setAllSelected,
  removeSelected,
  clearCart,
  mergeCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getCart);
router.post("/items", addCartItem);
router.patch("/items/:itemId", updateCartItem);
router.delete("/items/:itemId", removeCartItem);
router.patch("/select-all", setAllSelected);
router.delete("/selected", removeSelected);
router.delete("/", clearCart);
router.post("/merge", mergeCart);

module.exports = router;

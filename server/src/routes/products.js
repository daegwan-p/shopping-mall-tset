const express = require("express");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const {
  getVariantsByProduct,
  createVariant,
} = require("../controllers/variantController");
const { protect, adminOnly, optionalProtect } = require("../middleware/auth");

const router = express.Router();

router.get("/", optionalProtect, getProducts);
router.get("/:id", optionalProtect, getProduct);
router.post("/", protect, adminOnly, createProduct);
router.patch("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

router.get("/:productId/variants", getVariantsByProduct);
router.post("/:productId/variants", protect, adminOnly, createVariant);

module.exports = router;

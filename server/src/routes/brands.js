const express = require("express");
const {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");
const { protect, adminOnly, optionalProtect } = require("../middleware/auth");

const router = express.Router();

router.get("/", optionalProtect, getBrands);
router.get("/:id", getBrand);
router.post("/", protect, adminOnly, createBrand);
router.patch("/:id", protect, adminOnly, updateBrand);
router.delete("/:id", protect, adminOnly, deleteBrand);

module.exports = router;

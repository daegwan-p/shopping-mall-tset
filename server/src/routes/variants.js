const express = require("express");
const {
  updateVariant,
  deleteVariant,
} = require("../controllers/variantController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.patch("/:id", protect, adminOnly, updateVariant);
router.delete("/:id", protect, adminOnly, deleteVariant);

module.exports = router;

const express = require("express");
const {
  getDashboardStats,
  getInventory,
  getSettlement,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getDashboardStats);
router.get("/inventory", getInventory);
router.get("/settlement", getSettlement);

module.exports = router;

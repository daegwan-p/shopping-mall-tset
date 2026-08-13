const express = require("express");
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  cancelOrder,
  deleteOrder,
  cleanupTestOrders,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getOrders);
router.post("/cleanup", adminOnly, cleanupTestOrders);
router.get("/:id", getOrder);
router.post("/", createOrder);
router.post("/:id/cancel", cancelOrder);
router.patch("/:id", adminOnly, updateOrder);
router.delete("/:id", adminOnly, deleteOrder);

module.exports = router;

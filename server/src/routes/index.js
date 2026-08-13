const express = require("express");
const authRoutes = require("./auth");
const userRoutes = require("./users");
const brandRoutes = require("./brands");
const productRoutes = require("./products");
const variantRoutes = require("./variants");
const orderRoutes = require("./orders");
const cartRoutes = require("./carts");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/brands", brandRoutes);
router.use("/products", productRoutes);
router.use("/variants", variantRoutes);
router.use("/orders", orderRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", require("./wishlists"));
router.use("/reviews", require("./reviews"));
router.use("/rewards", require("./rewards"));
router.use("/coupons", require("./coupons"));
router.use("/payments", require("./payments"));
router.use("/admin", require("./admin"));

module.exports = router;

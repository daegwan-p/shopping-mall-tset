const express = require("express");
const { confirmPayment } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(protect);
router.post("/confirm", asyncHandler(confirmPayment));

module.exports = router;

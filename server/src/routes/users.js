const express = require("express");
const {
  updateMe,
  updatePassword,
  deleteMe,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.patch("/me", updateMe);
router.patch("/me/password", updatePassword);
router.delete("/me", deleteMe);

module.exports = router;

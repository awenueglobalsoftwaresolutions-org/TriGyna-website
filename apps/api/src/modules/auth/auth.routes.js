const express = require("express");
const {
  login,
  logout,
  getMe,
  updateProfile,
  verifyActivationToken,
  activateAccount,
} = require("./auth.controller");
const { requireAuth } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, updateProfile);

// Secure staff account activation endpoints
router.get("/verify-activation-token", verifyActivationToken);
router.post("/activate-account", authLimiter, activateAccount);

module.exports = router;

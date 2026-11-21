const express = require("express");
const {
  login,
  logout,
  getMe,
  updateProfile,
  verifyActivationToken,
  activateAccount,
} = require("./auth.controller");
const {
  forgotPassword,
  resetPassword,
  confirmEmailVerification,
  sendEmailVerification,
} = require("../email/email.controller");
const { requireAuth } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, updateProfile);

// Password recovery & reset endpoints
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Email verification endpoints
router.post("/verify-email/send", requireAuth, authLimiter, sendEmailVerification);
router.post("/verify-email/confirm", authLimiter, confirmEmailVerification);

// Secure staff account activation endpoints
router.get("/verify-activation-token", verifyActivationToken);
router.post("/activate-account", authLimiter, activateAccount);

module.exports = router;

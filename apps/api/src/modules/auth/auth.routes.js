const express = require("express");
const { login, logout, getMe } = require("./auth.controller");
const { requireAuth } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);

module.exports = router;

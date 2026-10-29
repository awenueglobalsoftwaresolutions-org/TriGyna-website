const rateLimit = require("express-rate-limit");
const { sendError } = require("../shared/response");

// General API rate limiter (200 requests per 15 minutes in prod, skipped/high in dev/test)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 200 : 50000,
  skip: (req) => process.env.NODE_ENV === "test" || (process.env.NODE_ENV !== "production" && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1")),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP. Please try again after 15 minutes.",
    });
  },
});

// Stricter limiter for public enquiry form (10 submissions per 15 minutes)
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      code: "TOO_MANY_ENQUIRIES",
      message: "Multiple enquiries detected from this address. Please reach us directly via WhatsApp or phone.",
    });
  },
});

// Stricter limiter for auth login attempts (15 attempts per 15 mins in production, 1000 in dev/test)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 15 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "Too many login attempts. Please wait 15 minutes before trying again.",
    });
  },
});

module.exports = {
  apiLimiter,
  enquiryLimiter,
  authLimiter,
};

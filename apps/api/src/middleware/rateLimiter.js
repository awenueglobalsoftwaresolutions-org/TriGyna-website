const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { getRedisClient, isRedisConnected } = require("../infrastructure/redis/redisClient");
const redisConfig = require("../config/redis.config");
const redisKeys = require("../infrastructure/redis/redisKeys");
const { sendError } = require("../shared/response");

/**
 * Build a distributed Redis store with fallback capabilities.
 */
function createStore(name) {
  if (!redisConfig.RATE_LIMIT_ENABLED) {
    return undefined; // Use default in-memory store
  }

  try {
    const client = getRedisClient();
    return new RedisStore({
      sendCommand: (...args) => client.call(...args),
      prefix: redisKeys.rateLimitPrefix(name),
    });
  } catch (err) {
    console.warn(`[RateLimit] Failed to initialize Redis store for "${name}". Falling back to in-memory:`, err.message);
    return undefined;
  }
}

// 1. General API rate limiter (Configurable via RATE_LIMIT_API_MAX)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: redisConfig.RATE_LIMIT_API_MAX,
  passOnStoreError: true, // Fail-open: If Redis fails, do not block legitimate API traffic
  store: createStore("api"),
  skip: (req) =>
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV !== "production" &&
      (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1")),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this address. Please try again after 15 minutes.",
    });
  },
});

// 2. Public enquiry form limiter (Configurable via RATE_LIMIT_ENQUIRY_MAX)
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: redisConfig.RATE_LIMIT_ENQUIRY_MAX,
  passOnStoreError: true,
  store: createStore("enquiry"),
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

// 3. Stricter authentication & login rate limiter (Configurable via RATE_LIMIT_AUTH_MAX)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: redisConfig.RATE_LIMIT_AUTH_MAX,
  passOnStoreError: true,
  store: createStore("auth"),
  skip: (req) => process.env.NODE_ENV === "test",
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

// 4. Document verification rate limiter (Configurable via RATE_LIMIT_DOC_VERIFICATION_MAX)
const documentVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: redisConfig.RATE_LIMIT_DOC_VERIFICATION_MAX,
  passOnStoreError: true,
  store: createStore("doc_verify"),
  skip: (req) =>
    process.env.NODE_ENV === "test" ||
    (process.env.NODE_ENV !== "production" &&
      (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1")),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      statusCode: 429,
      code: "TOO_MANY_VERIFICATION_REQUESTS",
      message: "Too many document verification requests. Please wait 15 minutes before trying again.",
    });
  },
});

module.exports = {
  apiLimiter,
  enquiryLimiter,
  authLimiter,
  documentVerificationLimiter,
};

const env = require("./env");

const nodeEnv = env.NODE_ENV || "development";
const isProd = nodeEnv === "production";
const isTest = nodeEnv === "test";

/**
 * Mask sensitive credentials from a Redis connection URL or password string.
 */
function maskRedisUrl(url) {
  if (!url || typeof url !== "string") return "[URL_NOT_CONFIGURED]";
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

// Connection Resolution Priority:
// Inside Railway container: Uses private internal network (redis.railway.internal:6379)
// Outside Railway / Local testing: Automatically falls back to REDIS_PUBLIC_URL if internal host cannot be reached
const isRailway = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID
);

let rawRedisUrl = env.REDIS_URL || null;

if (!isRailway && rawRedisUrl && rawRedisUrl.includes("railway.internal") && process.env.REDIS_PUBLIC_URL) {
  rawRedisUrl = process.env.REDIS_PUBLIC_URL;
} else if (!rawRedisUrl && process.env.REDIS_PUBLIC_URL) {
  rawRedisUrl = process.env.REDIS_PUBLIC_URL;
}

const redisHost =
  env.REDIS_HOST ||
  (isProd ? null : "127.0.0.1");

const redisPort = env.REDIS_PORT || 6379;
const redisUsername = env.REDIS_USERNAME || "";
const redisPassword = env.REDIS_PASSWORD || "";
const redisTls = env.REDIS_TLS;

const redisConfig = {
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: isProd,
  IS_TEST: isTest,

  // Connection options
  url: rawRedisUrl,
  host: redisHost,
  port: redisPort,
  username: redisUsername,
  password: redisPassword,
  tls: redisTls ? {} : undefined,

  // Network & Timeout parameters
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
  commandTimeout: process.env.REDIS_COMMAND_TIMEOUT
    ? parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10)
    : undefined,
  maxRetries: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 10,

  // Cache configuration
  CACHE_ENABLED: process.env.CACHE_ENABLED !== "false",
  CACHE_DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 300, // 5 minutes default
  CACHE_KEY_PREFIX: process.env.CACHE_KEY_PREFIX || "trigyna",

  // Rate Limiting configuration
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== "false",
  RATE_LIMIT_API_MAX: parseInt(process.env.RATE_LIMIT_API_MAX, 10) || (isProd ? 200 : 50000),
  RATE_LIMIT_AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || (isProd ? 15 : 1000),
  RATE_LIMIT_ENQUIRY_MAX: parseInt(process.env.RATE_LIMIT_ENQUIRY_MAX, 10) || 15,
  RATE_LIMIT_DOC_VERIFICATION_MAX: parseInt(process.env.RATE_LIMIT_DOC_VERIFICATION_MAX, 10) || (isProd ? 60 : 10000),

  // Helpers
  maskRedisUrl,
};

/**
 * Validate configuration without logging sensitive credentials.
 */
function validateRedisConfig() {
  const result = {
    valid: true,
    connectionType: redisConfig.url ? "URL" : "PARAMETERS",
    target: redisConfig.url
      ? maskRedisUrl(redisConfig.url)
      : `${redisConfig.username ? redisConfig.username + "@" : ""}${redisConfig.host || "none"}:${redisConfig.port}`,
    cacheEnabled: redisConfig.CACHE_ENABLED,
    rateLimitEnabled: redisConfig.RATE_LIMIT_ENABLED,
  };

  if (isProd && redisConfig.RATE_LIMIT_ENABLED) {
    if (!redisConfig.url && !redisConfig.host) {
      result.valid = false;
      result.error = "Production Redis host or REDIS_URL must be defined when rate limiting or caching is enabled.";
    }
  }

  return result;
}

redisConfig.validateRedisConfig = validateRedisConfig;

module.exports = redisConfig;

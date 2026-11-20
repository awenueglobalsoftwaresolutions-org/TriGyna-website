const dotenv = require("dotenv");
const path = require("path");

// Load .env from apps/api/.env or current working directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";
const isTest = nodeEnv === "test";

const CANONICAL_SITE_URL = "https://www.trigyna.in";
const CANONICAL_HOSTNAME = "www.trigyna.in";

const defaultFrontendOrigin = nodeEnv === "production" ? CANONICAL_SITE_URL : "http://localhost:3000";
const frontendOrigin = (
  process.env.FRONTEND_URL ||
  process.env.FRONTEND_ORIGIN ||
  process.env.APP_URL ||
  defaultFrontendOrigin
).replace(/\/+$/, "");

const explicitCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    frontendOrigin,
    ...(nodeEnv === "production"
      ? ["https://www.trigyna.in", "https://trigyna.in"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"]),
    ...explicitCorsOrigins,
  ])
);

const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: isTest
    ? (process.env.TEST_MONGODB_URI || process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/trigyna_test")
    : (process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna"),
  APP_URL: process.env.APP_URL || frontendOrigin,
  FRONTEND_URL: frontendOrigin,
  FRONTEND_ORIGIN: frontendOrigin,
  CANONICAL_SITE_URL,
  CANONICAL_HOSTNAME,
  ALLOWED_ORIGINS: allowedOrigins,
  SESSION_SECRET: process.env.SESSION_SECRET || "dev_session_secret_trigyna_fallback_928341",
  JWT_SECRET: process.env.JWT_SECRET || "dev_jwt_secret_trigyna_fallback_928341",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
};

// Strict security validation for production environments
if (env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("fallback") || process.env.JWT_SECRET.length < 32) {
    throw new Error("FATAL: JWT_SECRET must be securely set in production with at least 32 characters!");
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes("fallback") || process.env.SESSION_SECRET.length < 32) {
    throw new Error("FATAL: SESSION_SECRET must be securely set in production with at least 32 characters!");
  }
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("127.0.0.1") || process.env.MONGODB_URI.includes("localhost")) {
    console.warn("[Security] WARNING: Production MONGODB_URI appears to target a local non-replicated database instance.");
  }
}

module.exports = env;

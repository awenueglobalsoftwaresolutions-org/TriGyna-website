/**
 * TriGyna Enterprise Security Configuration & Environment Validation Module
 * 
 * Strict DevSecOps Standards:
 * - Centralized environment parsing with Zod schema validation
 * - Zero hardcoded secrets, fallbacks, or predictable test credentials in production
 * - Fail-fast enforcement: throws immediately on missing required production configuration
 * - Ephemeral cryptographically random secrets for development sessions when unconfigured
 * - Safe credential masking: secrets are never leaked in logs, stack traces, or responses
 */

const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const { z } = require("zod");

// 1. Load local environment file safely
const envPath = process.env.ENV_FILE || path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

// Determine active environment
const rawNodeEnv = (process.env.NODE_ENV || "development").toLowerCase().trim();
const nodeEnv = ["production", "test", "development"].includes(rawNodeEnv) ? rawNodeEnv : "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";
const isDevelopment = nodeEnv === "development";

// Canonical domain constants
const CANONICAL_SITE_URL = "https://www.trigyna.in";
const CANONICAL_HOSTNAME = "www.trigyna.in";

/**
 * Mask sensitive credentials for safe diagnostics and logging.
 * Replaces middle characters with asterisks, preserving only length/format hints.
 */
function maskSecret(str) {
  if (!str || typeof str !== "string") return "[NOT_CONFIGURED]";
  if (str.length <= 8) return "********";
  return `${str.slice(0, 3)}****${str.slice(-3)} (${str.length} chars)`;
}

/**
 * Mask sensitive credentials from MongoDB URIs.
 * Replaces :password@ with :****@
 */
function maskMongoUri(uri) {
  if (!uri || typeof uri !== "string") return "[URI_NOT_CONFIGURED]";
  return uri.replace(/\/\/[^\s]+@([^@\s]+)/, "//***:***@$1");
}

/**
 * Disallowed insecure fallback strings that must never be used as secrets
 */
const INSECURE_PATTERNS = [
  "dev_jwt_secret",
  "dev_session_secret",
  "dev_jwt_refresh",
  "secret123",
  "change_me",
  "password",
  "fallback",
  "your_secret",
  "your_jwt",
  "placeholder",
  "default_secret",
  "admin123",
  "trigyna_rzp_secret",
  "trigyna_rzp_webhook",
  "rzp_test_trigyna",
];

function isPredictableSecret(val) {
  if (!val || typeof val !== "string") return false;
  const lower = val.toLowerCase();
  return INSECURE_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Resolve authentication secrets safely:
 * - Production: Strictly requires environment variable >= 32 chars, rejects predictable values.
 * - Test: Provides isolated deterministic test secrets so tests pass safely in local test harness.
 * - Development: Generates ephemeral 64-char crypto-random string per process session if unset.
 */
function resolveSecret(envVarName, options = {}) {
  const envVal = process.env[envVarName];

  if (envVal && typeof envVal === "string" && envVal.trim().length > 0) {
    const trimmed = envVal.trim();
    if (isProduction && isPredictableSecret(trimmed)) {
      throw new Error(
        `FATAL SECURITY CONFIGURATION: Environment variable '${envVarName}' contains an insecure predictable or fallback value in production.`
      );
    }
    return trimmed;
  }

  if (isProduction) {
    throw new Error(
      `FATAL SECURITY CONFIGURATION: Missing required production environment variable '${envVarName}'. Production secrets must be explicitly set via your deployment secret manager.`
    );
  }

  if (isTest) {
    // Deterministic test secret for test harness isolation
    return `test_env_${envVarName.toLowerCase()}_minimum_32_characters_deterministic_key`;
  }

  // Development fallback: Ephemeral cryptographically random secret
  const ephemeral = crypto.randomBytes(32).toString("hex");
  if (!options.silent) {
    console.warn(
      `[Security Notice] '${envVarName}' is not set in local environment. Generated ephemeral 64-character random key for this local runtime session.`
    );
  }
  return ephemeral;
}

// 2. Resolve URLs & Origins
const defaultFrontendOrigin = isProduction ? CANONICAL_SITE_URL : "http://localhost:3000";
const rawFrontendOrigin = (
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
    rawFrontendOrigin,
    ...(isProduction
      ? ["https://www.trigyna.in", "https://trigyna.in"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"]),
    ...explicitCorsOrigins,
  ])
);

// 3. Database URI Resolution
let resolvedMongoUri;
if (isTest) {
  resolvedMongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/trigyna_test";
} else if (isProduction) {
  if (!process.env.MONGODB_URI) {
    throw new Error("FATAL SECURITY CONFIGURATION: 'MONGODB_URI' is strictly required in production!");
  }
  const uri = process.env.MONGODB_URI.trim();
  if (
    uri.includes("127.0.0.1") ||
    uri.includes("localhost") ||
    uri.includes("0.0.0.0") ||
    uri.includes("::1")
  ) {
    throw new Error(
      "FATAL SECURITY CONFIGURATION: Production 'MONGODB_URI' cannot target loopback / localhost address. Must be a secure MongoDB Atlas or production cluster URI."
    );
  }
  resolvedMongoUri = uri;
} else {
  resolvedMongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
}

const dbName = process.env.DB_NAME || process.env.MONGODB_DB_NAME || (isTest ? "trigyna_test" : "trigyna");

// 4. Resolve Cryptographic Authentication Secrets
const jwtSecret = resolveSecret("JWT_SECRET");
const jwtRefreshSecret = resolveSecret("JWT_REFRESH_SECRET", { silent: true });
const sessionSecret = resolveSecret("SESSION_SECRET", { silent: true });

// Ensure independent secrets
if (jwtSecret === jwtRefreshSecret) {
  if (isProduction) {
    throw new Error("FATAL SECURITY CONFIGURATION: 'JWT_SECRET' and 'JWT_REFRESH_SECRET' must be distinct independent cryptographic keys!");
  }
}
if (jwtSecret === sessionSecret) {
  if (isProduction) {
    throw new Error("FATAL SECURITY CONFIGURATION: 'JWT_SECRET' and 'SESSION_SECRET' must be distinct independent cryptographic keys!");
  }
}

// 5. Payment Gateway Configuration
const razorpayMode = (process.env.RAZORPAY_MODE || (isProduction ? "live" : "test")).toLowerCase().trim();
const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
const razorpayWebhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

if (isProduction) {
  if (razorpayKeySecret && isPredictableSecret(razorpayKeySecret)) {
    throw new Error("FATAL SECURITY CONFIGURATION: 'RAZORPAY_KEY_SECRET' contains an insecure fallback value in production.");
  }
  if (razorpayWebhookSecret && isPredictableSecret(razorpayWebhookSecret)) {
    throw new Error("FATAL SECURITY CONFIGURATION: 'RAZORPAY_WEBHOOK_SECRET' contains an insecure fallback value in production.");
  }
  if (razorpayKeySecret && razorpayWebhookSecret && razorpayKeySecret === razorpayWebhookSecret) {
    throw new Error("FATAL SECURITY CONFIGURATION: 'RAZORPAY_WEBHOOK_SECRET' cannot be identical to 'RAZORPAY_KEY_SECRET'.");
  }
}

// 6. Email Configuration
const emailProvider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase().trim();
const emailEnabled = process.env.EMAIL_ENABLED !== "false" && process.env.EMAIL_ENABLED !== false;
const emailFromAddress = (process.env.EMAIL_FROM_ADDRESS || process.env.RESEND_FROM_EMAIL || "support@trigyna.in").trim();
const emailFromName = (process.env.EMAIL_FROM_NAME || process.env.RESEND_FROM_NAME || "TriGyna").trim();
const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
const resendWebhookSecret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();

// 7. Redis Configuration
const redisUrl = process.env.REDIS_URL || null;
const redisHost = process.env.REDIS_HOST || process.env.REDISHOST || (isProduction ? null : "127.0.0.1");
const redisPort = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || "6379", 10);
const redisUsername = process.env.REDIS_USERNAME || process.env.REDISUSER || "";
const redisPassword = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || "";
const redisTls = process.env.REDIS_TLS === "true" || (redisUrl && redisUrl.startsWith("rediss://"));

// 8. Meta / WhatsApp Configuration
const metaGraphApiVersion = process.env.META_GRAPH_API_VERSION || "v21.0";
const metaAccessToken = (process.env.META_ACCESS_TOKEN || "").trim();
const metaWhatsAppPhoneNumberId = (process.env.META_WHATSAPP_PHONE_NUMBER_ID || "").trim();
const metaWebhookVerifyToken = (process.env.META_WEBHOOK_VERIFY_TOKEN || "").trim();
const metaWebhookAppSecret = (process.env.META_WEBHOOK_APP_SECRET || "").trim();

// 9. Admin Provisioning Variables (Explicit only — no hardcoded personal details or passwords)
const adminName = (process.env.ADMIN_NAME || "").trim();
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPhone = (process.env.ADMIN_PHONE || "").trim();
const adminInitialPassword = (process.env.ADMIN_INITIAL_PASSWORD || "").trim();

// 10. Zod Validation Schema
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.number().int().min(1).max(65535),
  MONGODB_URI: z.string().min(10).refine((val) => val.startsWith("mongodb://") || val.startsWith("mongodb+srv://"), {
    message: "MONGODB_URI must be a valid MongoDB connection string starting with mongodb:// or mongodb+srv://",
  }),
  DB_NAME: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  FRONTEND_ORIGIN: z.string().url(),
  BACKEND_URL: z.string().url(),
  CANONICAL_SITE_URL: z.string().url(),
  CANONICAL_HOSTNAME: z.string().min(3),
  ALLOWED_ORIGINS: z.array(z.string()),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters long"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().min(1),
  RAZORPAY_MODE: z.enum(["test", "live"]),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),
  EMAIL_PROVIDER: z.string(),
  EMAIL_ENABLED: z.boolean(),
  EMAIL_FROM_ADDRESS: z.string().email(),
  EMAIL_FROM_NAME: z.string(),
  RESEND_API_KEY: z.string(),
  RESEND_WEBHOOK_SECRET: z.string(),
  REDIS_URL: z.string().nullable().optional(),
  REDIS_HOST: z.string().nullable().optional(),
  REDIS_PORT: z.number().int().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.boolean().optional(),
  META_GRAPH_API_VERSION: z.string(),
  META_ACCESS_TOKEN: z.string(),
  META_WHATSAPP_PHONE_NUMBER_ID: z.string(),
  META_WEBHOOK_VERIFY_TOKEN: z.string(),
  META_WEBHOOK_APP_SECRET: z.string(),
  ADMIN_NAME: z.string(),
  ADMIN_EMAIL: z.string(),
  ADMIN_PHONE: z.string(),
  ADMIN_INITIAL_PASSWORD: z.string(),
});

const configData = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: resolvedMongoUri,
  DB_NAME: dbName,
  MONGODB_DB_NAME: dbName,
  APP_URL: rawFrontendOrigin,
  FRONTEND_URL: rawFrontendOrigin,
  FRONTEND_ORIGIN: rawFrontendOrigin,
  BACKEND_URL: process.env.BACKEND_URL || `http://127.0.0.1:${parseInt(process.env.PORT, 10) || 5000}`,
  CANONICAL_SITE_URL,
  CANONICAL_HOSTNAME,
  ALLOWED_ORIGINS: allowedOrigins,
  SESSION_SECRET: sessionSecret,
  JWT_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  RAZORPAY_MODE: razorpayMode,
  RAZORPAY_KEY_ID: razorpayKeyId,
  RAZORPAY_KEY_SECRET: razorpayKeySecret,
  RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
  EMAIL_PROVIDER: emailProvider,
  EMAIL_ENABLED: emailEnabled,
  EMAIL_FROM_ADDRESS: emailFromAddress,
  EMAIL_FROM_NAME: emailFromName,
  RESEND_API_KEY: resendApiKey,
  RESEND_WEBHOOK_SECRET: resendWebhookSecret,
  REDIS_URL: redisUrl,
  REDIS_HOST: redisHost,
  REDIS_PORT: redisPort,
  REDIS_USERNAME: redisUsername,
  REDIS_PASSWORD: redisPassword,
  REDIS_TLS: Boolean(redisTls),
  META_GRAPH_API_VERSION: metaGraphApiVersion,
  META_ACCESS_TOKEN: metaAccessToken,
  META_WHATSAPP_PHONE_NUMBER_ID: metaWhatsAppPhoneNumberId,
  META_WEBHOOK_VERIFY_TOKEN: metaWebhookVerifyToken,
  META_WEBHOOK_APP_SECRET: metaWebhookAppSecret,
  ADMIN_NAME: adminName,
  ADMIN_EMAIL: adminEmail,
  ADMIN_PHONE: adminPhone,
  ADMIN_INITIAL_PASSWORD: adminInitialPassword,
};

// Validate against schema
const parsed = EnvironmentSchema.safeParse(configData);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  const errorMsg = `FATAL CONFIGURATION ERROR: Environment validation failed:\n  - ${issues.join("\n  - ")}`;
  if (isProduction) {
    throw new Error(errorMsg);
  } else {
    console.warn(`[Configuration Warning] ${issues.join("; ")}`);
  }
}

// Production security assertions
if (isProduction) {
  const missingCritical = [];
  if (!jwtSecret || jwtSecret.length < 32) missingCritical.push("JWT_SECRET (must be >= 32 characters)");
  if (!sessionSecret || sessionSecret.length < 32) missingCritical.push("SESSION_SECRET (must be >= 32 characters)");
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) missingCritical.push("JWT_REFRESH_SECRET (must be >= 32 characters)");
  if (!resolvedMongoUri) missingCritical.push("MONGODB_URI");

  if (missingCritical.length > 0) {
    throw new Error(
      `FATAL PRODUCTION SECURITY ERROR: The following mandatory credentials are missing or invalid in production:\n  - ${missingCritical.join(
        "\n  - "
      )}`
    );
  }

  // HTTPS assertions for production URLs
  if (!rawFrontendOrigin.startsWith("https://")) {
    throw new Error(`FATAL SECURITY ERROR: FRONTEND_URL must use HTTPS in production. Provided: '${rawFrontendOrigin}'`);
  }
}

/**
 * Return sanitized metadata safe for public / admin health queries
 */
function getSanitizedTelemetry() {
  return {
    environment: nodeEnv,
    port: configData.PORT,
    mongoTarget: maskMongoUri(configData.MONGODB_URI),
    dbName: configData.DB_NAME,
    frontendOrigin: configData.FRONTEND_ORIGIN,
    backendUrl: configData.BACKEND_URL,
    allowedOrigins: configData.ALLOWED_ORIGINS,
    authConfigured: {
      jwtConfigured: Boolean(jwtSecret && jwtSecret.length >= 32),
      jwtRefreshConfigured: Boolean(jwtRefreshSecret && jwtRefreshSecret.length >= 32),
      sessionConfigured: Boolean(sessionSecret && sessionSecret.length >= 32),
      tokenExpiresIn: configData.JWT_EXPIRES_IN,
    },
    paymentsConfigured: {
      mode: configData.RAZORPAY_MODE,
      hasKeyId: Boolean(configData.RAZORPAY_KEY_ID),
      hasSecret: Boolean(configData.RAZORPAY_KEY_SECRET),
      hasWebhookSecret: Boolean(configData.RAZORPAY_WEBHOOK_SECRET),
    },
    emailConfigured: {
      provider: configData.EMAIL_PROVIDER,
      enabled: configData.EMAIL_ENABLED,
      fromAddress: configData.EMAIL_FROM_ADDRESS,
      hasResendKey: Boolean(configData.RESEND_API_KEY),
      hasWebhookSecret: Boolean(configData.RESEND_WEBHOOK_SECRET),
    },
    redisConfigured: {
      configured: Boolean(configData.REDIS_URL || configData.REDIS_HOST),
      hasPassword: Boolean(configData.REDIS_PASSWORD),
      tls: configData.REDIS_TLS,
    },
  };
}

const env = Object.freeze({
  ...configData,
  maskSecret,
  maskMongoUri,
  getSanitizedTelemetry,
});

module.exports = env;

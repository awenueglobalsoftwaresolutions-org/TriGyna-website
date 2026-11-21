const env = require("./env");

/**
 * Resend Email Notification System Configuration
 * Strict DevSecOps: Never hardcode or leak API keys, SMTP passwords, or signing secrets.
 */

const nodeEnv = env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const apiKey = env.RESEND_API_KEY || "";
const webhookSecret = env.RESEND_WEBHOOK_SECRET || "";
const fromEmail = env.EMAIL_FROM_ADDRESS || "support@trigyna.in";
const fromName = env.EMAIL_FROM_NAME || "TriGyna";
const smtpHost = process.env.RESEND_SMTP_HOST || "smtp.resend.com";
const smtpPort = parseInt(process.env.RESEND_SMTP_PORT, 10) || 465;
const smtpUser = process.env.RESEND_SMTP_USER || "resend";
const smtpPassword = process.env.RESEND_SMTP_PASSWORD || "";
const emailEnabled = env.EMAIL_ENABLED;
const provider = env.EMAIL_PROVIDER;

function validateEmailConfig() {
  const missing = [];

  if (emailEnabled && isProduction) {
    if (provider === "resend") {
      if (!apiKey) {
        missing.push("RESEND_API_KEY");
      } else if (!apiKey.startsWith("re_")) {
        throw new Error("Configuration Error: RESEND_API_KEY must be a valid Resend API key starting with 're_'.");
      }

      if (!webhookSecret) {
        missing.push("RESEND_WEBHOOK_SECRET");
      } else if (!webhookSecret.startsWith("whsec_")) {
        throw new Error("Configuration Error: RESEND_WEBHOOK_SECRET must be a valid Svix signing secret starting with 'whsec_'.");
      }
    } else if (provider === "smtp") {
      if (!smtpHost) missing.push("RESEND_SMTP_HOST");
      if (!smtpUser) missing.push("RESEND_SMTP_USER");
      if (!smtpPassword) missing.push("RESEND_SMTP_PASSWORD");
    }

    if (!fromEmail || !fromEmail.includes("@")) {
      missing.push("EMAIL_FROM_ADDRESS");
    }

    if (missing.length > 0) {
      throw new Error(`FATAL: Missing required production email configuration environment variable(s): ${missing.join(", ")}`);
    }
  }

  return true;
}

// Perform validation
try {
  validateEmailConfig();
} catch (err) {
  if (isProduction) {
    throw err;
  } else if (!isTest) {
    console.warn(`[Email Config Notice] ${err.message}`);
  }
}

/**
 * Returns safe public metadata for health inspection and admin dashboards
 * Never exposes raw secrets, passwords, or tokens.
 */
function getPublicConfig() {
  return {
    provider,
    enabled: emailEnabled,
    fromEmail,
    fromName,
    smtpHost,
    smtpPort,
    smtpUser,
    hasApiKey: Boolean(apiKey && apiKey.length > 5),
    hasWebhookSecret: Boolean(webhookSecret && webhookSecret.length > 5),
    hasSmtpPassword: Boolean(smtpPassword && smtpPassword.length > 5),
    environment: nodeEnv,
  };
}

module.exports = {
  apiKey,
  webhookSecret,
  fromEmail,
  fromName,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword,
  emailEnabled,
  provider,
  frontendUrl: env.FRONTEND_URL,
  backendUrl: env.BACKEND_URL,
  appBaseUrl: env.APP_URL || env.FRONTEND_URL,
  validateEmailConfig,
  getPublicConfig,
};

const env = require("./env");

/**
 * Resend Email Notification System Configuration
 * Strict DevSecOps: Never hardcode or leak API keys, SMTP passwords, or signing secrets.
 */

const nodeEnv = env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const apiKey = process.env.RESEND_API_KEY || "";
const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM_ADDRESS || "care@trigyna.in";
const fromName = process.env.RESEND_FROM_NAME || process.env.EMAIL_FROM_NAME || "TriGyna";
const smtpHost = process.env.RESEND_SMTP_HOST || "smtp.resend.com";
const smtpPort = parseInt(process.env.RESEND_SMTP_PORT, 10) || 465;
const smtpUser = process.env.RESEND_SMTP_USER || "resend";
const smtpPassword = process.env.RESEND_SMTP_PASSWORD || "";
const emailEnabled = process.env.EMAIL_ENABLED !== "false" && process.env.EMAIL_ENABLED !== false;
const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

function validateEmailConfig() {
  const missing = [];

  if (emailEnabled && isProduction) {
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

    if (!fromEmail || !fromEmail.includes("@")) {
      missing.push("RESEND_FROM_EMAIL");
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

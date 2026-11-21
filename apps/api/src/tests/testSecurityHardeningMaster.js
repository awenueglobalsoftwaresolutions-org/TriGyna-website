/**
 * TriGyna Master Security Hardening Verification Suite
 * Verifies all security constraints, fail-fast production rules, secret masking,
 * cryptographic guarantees, and webhook signature verification.
 */

const assert = require("assert");
const { execSync } = require("child_process");
const path = require("path");
const crypto = require("crypto");

process.env.NODE_ENV = "test";

console.log("=== STARTING TRIGYNA MASTER SECURITY VERIFICATION SUITE ===\n");

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// Suite 1: In-Memory Unit Verification of env.js helpers
// -----------------------------------------------------------------------------
const env = require("../config/env");

runTest("1.1 maskSecret correctly redacts secrets", () => {
  const masked = env.maskSecret("super_sensitive_api_token_12345");
  assert(masked.startsWith("sup"), "Should preserve start");
  assert(masked.includes("45"), "Should preserve end");
  assert(masked.includes("****"), "Should mask intermediate bytes");
  assert(!masked.includes("sensitive"), "Should never expose interior secret");
  assert.strictEqual(env.maskSecret(""), "[NOT_CONFIGURED]");
  assert.strictEqual(env.maskSecret(null), "[NOT_CONFIGURED]");
});

runTest("1.2 maskMongoUri correctly redacts credentials", () => {
  const uri = "mongodb+srv://admin_user:password_test_mock_123@cluster0.abcde.mongodb.net/trigyna?retryWrites=true";
  const masked = env.maskMongoUri(uri);
  assert(!masked.includes("password_test_mock_123"), "Password must not be in masked URI");
  assert(!masked.includes("admin_user"), "Username must not be in masked URI");
  assert(masked.includes("mongodb+srv://***:***@cluster0.abcde.mongodb.net/trigyna"), "Must mask user and pass");
});

runTest("1.3 getSanitizedTelemetry contains no raw secrets", () => {
  const telemetry = env.getSanitizedTelemetry();
  const serialized = JSON.stringify(telemetry);
  assert(!serialized.includes(env.JWT_SECRET), "JWT_SECRET must not appear raw in telemetry");
  assert(!serialized.includes(env.SESSION_SECRET), "SESSION_SECRET must not appear raw in telemetry");
  assert(!serialized.includes(env.JWT_REFRESH_SECRET), "JWT_REFRESH_SECRET must not appear raw in telemetry");
  assert(telemetry.authConfigured.jwtConfigured === true, "Telemetry flags configured status safely");
});

// -----------------------------------------------------------------------------
// Suite 2: Email and Response Masking Security
// -----------------------------------------------------------------------------
const emailConfig = require("../config/email.config");
const { sendError, sanitizeErrorDetail } = require("../shared/response");

runTest("2.1 emailConfig.getPublicConfig hides all provider keys and passwords", () => {
  const publicConfig = emailConfig.getPublicConfig();
  const serialized = JSON.stringify(publicConfig);
  assert(!serialized.includes("re_"), "Resend key or SMTP credentials must never be in public config");
  assert(!serialized.includes("password"), "Password must never appear in public config");
  assert.strictEqual(publicConfig.hasApiKey, Boolean(env.RESEND_API_KEY));
});

runTest("2.2 sendError and sanitizeErrorDetail redact MongoDB URIs and secrets from error responses", () => {
  const sensitiveError = {
    message: "Connection failed to mongodb+srv://app_user:test_mock_secret@prod-cluster.mongodb.net/trigyna",
    details: [
      "Authorization failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload",
      { connectionUri: "mongodb://user:test_pass_mock@10.0.0.1:27017/trigyna", status: "rejected" },
    ],
  };

  let capturedOutput = null;
  const mockRes = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      capturedOutput = data;
      return this;
    },
  };

  sendError(mockRes, sensitiveError);
  const serialized = JSON.stringify(capturedOutput);

  assert(!serialized.includes("test_mock_secret"), "Error message must not leak MongoDB password");
  assert(!serialized.includes("test_pass_mock"), "Error details must not leak database password");
  assert(!serialized.includes("sensitive_payload"), "Bearer tokens must be redacted");
  assert(serialized.includes("[REDACTED_AUTH]"), "MongoDB auth must be redacted");
});

// -----------------------------------------------------------------------------
// Suite 3: Razorpay Webhook & Payment Integrity
// -----------------------------------------------------------------------------
const razorpayService = require("../modules/billing/razorpay.service");

runTest("3.1 verifyWebhookSignature rejects invalid signature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_test123" } } } });
  const bogusSignature = "invalid_hex_signature_0000000000000000000000000000000000000000000000000000000000000000";
  const isValid = razorpayService.verifyWebhookSignature(body, bogusSignature);
  assert.strictEqual(isValid, false, "Invalid signature must return false");
});

runTest("3.2 verifyWebhookSignature validates correct HMAC SHA256 signature", () => {
  const originalSecret = razorpayService.webhookSecret;
  razorpayService.webhookSecret = razorpayService.webhookSecret || "test_mock_webhook_secret_for_test";
  try {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_test456" } } } });
    const validSignature = crypto
      .createHmac("sha256", razorpayService.webhookSecret)
      .update(body)
      .digest("hex");
    const isValid = razorpayService.verifyWebhookSignature(body, validSignature);
    assert.strictEqual(isValid, true, "Valid HMAC signature must return true");
  } finally {
    razorpayService.webhookSecret = originalSecret;
  }
});

runTest("3.3 verifyWebhookSignature strictly fails if signature was generated with keySecret instead of webhookSecret", () => {
  const originalSecret = razorpayService.webhookSecret;
  razorpayService.webhookSecret = "test_mock_webhook_secret_for_test";
  const testKeySecret = "different_test_key_secret_for_test";
  try {
    const body = JSON.stringify({ event: "payment.captured", id: "evt_123" });
    const keySecretSig = crypto
      .createHmac("sha256", testKeySecret)
      .update(body)
      .digest("hex");
    const isValid = razorpayService.verifyWebhookSignature(body, keySecretSig);
    assert.strictEqual(isValid, false, "Signature made with keySecret must NOT validate as webhook secret");
  } finally {
    razorpayService.webhookSecret = originalSecret;
  }
});

// -----------------------------------------------------------------------------
// Suite 4: Fail-Fast Production Validation via Isolated Subprocesses
// -----------------------------------------------------------------------------
const envScriptPath = path.resolve(__dirname, "../config/env.js");

function runSubprocessValidation(envOverrides) {
  const cleanEnv = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    NODE_ENV: "production",
    PORT: "5000",
    APP_URL: "https://www.trigyna.in",
    FRONTEND_URL: "https://www.trigyna.in",
    BACKEND_URL: "https://api.trigyna.in",
    MONGODB_URI: "mongodb+srv://user:test_password@cluster.mongodb.net/trigyna",
    JWT_SECRET: "a_very_secure_and_long_jwt_secret_value_minimum_32_characters",
    JWT_REFRESH_SECRET: "another_distinct_secure_refresh_secret_at_least_32_chars",
    SESSION_SECRET: "a_very_secure_and_long_session_secret_value_minimum_32_characters",
    ...envOverrides,
  };

  try {
    execSync(`node -e "require('${envScriptPath.replace(/\\/g, "\\\\")}')"`, {
      env: cleanEnv,
      stdio: "pipe",
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      status: err.status,
      stderr: err.stderr ? err.stderr.toString() : "",
      stdout: err.stdout ? err.stdout.toString() : "",
    };
  }
}

runTest("4.1 Production configuration succeeds when all required variables are valid", () => {
  const res = runSubprocessValidation({});
  assert.strictEqual(res.success, true, `Expected valid production config to pass, got: ${res.stderr}`);
});

runTest("4.2 Production fails fast when MONGODB_URI is missing", () => {
  const res = runSubprocessValidation({ MONGODB_URI: "" });
  assert.strictEqual(res.success, false, "Must fail without MONGODB_URI");
  assert(res.stderr.includes("MONGODB_URI"), "Error message must cite MONGODB_URI");
});

runTest("4.3 Production fails fast when MONGODB_URI points to localhost / 127.0.0.1", () => {
  const res = runSubprocessValidation({ MONGODB_URI: "mongodb://127.0.0.1:27017/trigyna" });
  assert.strictEqual(res.success, false, "Must fail with localhost MONGODB_URI in production");
  assert(res.stderr.includes("localhost"), "Error message must flag localhost reject");
});

runTest("4.4 Production fails fast when JWT_SECRET is missing", () => {
  const res = runSubprocessValidation({ JWT_SECRET: "" });
  assert.strictEqual(res.success, false, "Must fail without JWT_SECRET in production");
  assert(res.stderr.includes("JWT_SECRET"), "Error message must cite JWT_SECRET");
});

runTest("4.5 Production fails fast when JWT_SECRET is a known weak/fallback string", () => {
  const res = runSubprocessValidation({ JWT_SECRET: "dev_jwt_secret_trigyna_fallback_928341" });
  assert.strictEqual(res.success, false, "Must fail with weak fallback JWT_SECRET");
});

runTest("4.6 Production fails fast when JWT_SECRET and JWT_REFRESH_SECRET are identical", () => {
  const identicalSecret = "identical_secure_secret_value_over_32_characters_long!";
  const res = runSubprocessValidation({
    JWT_SECRET: identicalSecret,
    JWT_REFRESH_SECRET: identicalSecret,
  });
  assert.strictEqual(res.success, false, "Must fail when JWT_SECRET and JWT_REFRESH_SECRET match");
  assert(res.stderr.includes("JWT_REFRESH_SECRET"), "Error message must cite JWT_REFRESH_SECRET mismatch");
});

runTest("4.7 Production fails fast when SESSION_SECRET is shorter than 32 chars", () => {
  const res = runSubprocessValidation({ SESSION_SECRET: "too_short_secret" });
  assert.strictEqual(res.success, false, "Must fail with short SESSION_SECRET");
});

runTest("4.8 Production fails fast when FRONTEND_URL uses insecure http:// protocol", () => {
  const res = runSubprocessValidation({ FRONTEND_URL: "http://www.trigyna.in" });
  assert.strictEqual(res.success, false, "Must fail when FRONTEND_URL is not HTTPS in production");
  assert(res.stderr.toLowerCase().includes("https"), "Error message must enforce HTTPS");
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log("=======================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

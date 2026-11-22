const express = require("express");
const {
  sendEmailEndpoint,
  sendEmailVerification,
  confirmEmailVerification,
  getEmailStatus,
  getEmailHistory,
  getPreferences,
  updatePreferences,
  retryEmail,
  getAdminAnalytics,
  getAdminLogs,
  getAdminHealth,
  getAdminAutomations,
  updateAdminAutomation,
  getAdminTemplates,
  sendAdminTestEmail,
  resendInvoiceEmail,
  getAdminWebhookEvents,
} = require("./email.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const { authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

// Public / Token-based endpoints
router.post("/verification/confirm", authLimiter, confirmEmailVerification);

// Authenticated Endpoints
router.use(requireAuth);

// Direct Transactional Dispatch (Privileged clinic roles only)
router.post(
  "/send",
  requireRole("owner", "super_admin", "admin", "crm", "sales", "reception"),
  sendEmailEndpoint
);

// Email Verification Dispatch
router.post("/verification/send", authLimiter, sendEmailVerification);

// Status and History
router.get("/status/:emailId", getEmailStatus);
router.get("/history", getEmailHistory);

// Preferences
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

// Admin-Only Email Management, Automations, Logs & Analytics
const adminRoles = ["owner", "super_admin", "admin"];
router.post(["/:emailId/retry", "/admin/retry/:emailId", "/retry/:emailId"], requireRole(...adminRoles), retryEmail);
router.get(["/admin/analytics", "/admin/stats", "/analytics", "/stats"], requireRole(...adminRoles), getAdminAnalytics);
router.get(["/admin/logs", "/logs"], requireRole(...adminRoles), getAdminLogs);
router.get(["/admin/health", "/health"], requireRole(...adminRoles), getAdminHealth);
router.get(["/admin/automations", "/automations"], requireRole(...adminRoles), getAdminAutomations);
router.put(["/admin/automations/:eventType", "/automations/:eventType"], requireRole(...adminRoles), updateAdminAutomation);
router.get(["/admin/templates", "/templates"], requireRole(...adminRoles), getAdminTemplates);
router.post(["/admin/test", "/test"], requireRole(...adminRoles), sendAdminTestEmail);
router.post(["/admin/resend-invoice/:invoiceId", "/resend-invoice/:invoiceId"], requireRole(...adminRoles), resendInvoiceEmail);
router.get(["/admin/webhook-events", "/webhook-events"], requireRole(...adminRoles), getAdminWebhookEvents);

module.exports = router;

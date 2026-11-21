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

// Admin-Only Email Management & Analytics
router.post("/:emailId/retry", requireRole("owner", "super_admin", "admin"), retryEmail);
router.get("/admin/analytics", requireRole("owner", "super_admin", "admin"), getAdminAnalytics);
router.get("/admin/logs", requireRole("owner", "super_admin", "admin"), getAdminLogs);
router.get("/admin/health", requireRole("owner", "super_admin", "admin"), getAdminHealth);

module.exports = router;

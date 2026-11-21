const express = require("express");
const {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  resetUserPassword,
  updateUserStatus,
  revokeUserSessions,
  updateUserPermissions,
  getPermissionsCatalog,
  getUserSecurityHistory,
  getAuditLogs,
} = require("./user.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// All user management routes require auth and admin/owner role
router.use(requireAuth);

router.get("/audit-logs", requireRole("owner", "admin"), getAuditLogs);
router.get("/permissions/catalog", requireRole("owner", "admin"), getPermissionsCatalog);
router.get("/", requireRole("owner", "admin"), listUsers);
router.post("/", requireRole("owner", "admin"), createUser);
router.get("/:id/security-history", requireRole("owner", "admin"), getUserSecurityHistory);
router.patch("/:id/status", requireRole("owner", "admin"), updateUserStatus);
router.post("/:id/revoke-sessions", requireRole("owner", "admin"), revokeUserSessions);
router.patch("/:id/permissions", requireRole("owner", "admin"), updateUserPermissions);
router.get("/:id", requireRole("owner", "admin"), getUserById);
router.patch("/:id", requireRole("owner", "admin"), updateUser);
router.post("/:id/reset-password", requireRole("owner", "admin"), resetUserPassword);

module.exports = router;

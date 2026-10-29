const express = require("express");
const {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  resetUserPassword,
  getAuditLogs,
} = require("./user.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// All user management routes require auth and admin/owner role
router.use(requireAuth);

router.get("/audit-logs", requireRole("owner", "admin"), getAuditLogs);
router.get("/", requireRole("owner", "admin"), listUsers);
router.post("/", requireRole("owner", "admin"), createUser);
router.get("/:id", requireRole("owner", "admin"), getUserById);
router.patch("/:id", requireRole("owner", "admin"), updateUser);
router.post("/:id/reset-password", requireRole("owner", "admin"), resetUserPassword);

module.exports = router;

const express = require("express");
const { getPendingApprovals } = require("./approvals.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("owner", "admin", "hrms", "hr"));

router.get("/", getPendingApprovals);

module.exports = router;

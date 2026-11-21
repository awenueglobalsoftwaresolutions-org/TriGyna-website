const express = require("express");
const { getDashboardSummary } = require("./reports.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.get("/summary", requireRole("owner", "admin", "crm", "hrms", "reception", "doctor"), getDashboardSummary);

module.exports = router;

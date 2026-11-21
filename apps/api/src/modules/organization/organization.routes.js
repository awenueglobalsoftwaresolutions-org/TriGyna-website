const express = require("express");
const {
  getOrganization,
  updateOrganization,
  addBranch,
  addDepartment,
  addService,
} = require("./organization.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// All authenticated staff can view organization info
router.get("/", getOrganization);

// Only Super Admin (owner) and Admin can modify settings, branches, departments, and services
router.put("/", requireRole("owner", "admin"), updateOrganization);
router.post("/branches", requireRole("owner", "admin"), addBranch);
router.post("/departments", requireRole("owner", "admin"), addDepartment);
router.post("/services", requireRole("owner", "admin"), addService);

module.exports = router;

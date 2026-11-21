const express = require("express");
const {
  listAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  toggleAutomationRule,
  testAutomationRule,
  listAutomationExecutions,
} = require("./automation.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// Rules management (Admin/Owner/CRM/Sales read access)
router.get("/rules", requireRole("owner", "admin", "crm", "sales"), listAutomationRules);
router.post("/rules", requireRole("owner", "admin"), createAutomationRule);
router.patch("/rules/:id", requireRole("owner", "admin"), updateAutomationRule);
router.post("/rules/:id/toggle", requireRole("owner", "admin"), toggleAutomationRule);
router.post("/rules/:id/enable", requireRole("owner", "admin"), (req, res, next) => {
  req.body.enabled = true;
  return toggleAutomationRule(req, res, next);
});
router.post("/rules/:id/disable", requireRole("owner", "admin"), (req, res, next) => {
  req.body.enabled = false;
  return toggleAutomationRule(req, res, next);
});
router.post("/rules/:id/test", requireRole("owner", "admin"), testAutomationRule);

// Execution Logs
router.get("/executions", requireRole("owner", "admin", "crm", "sales"), listAutomationExecutions);

module.exports = router;


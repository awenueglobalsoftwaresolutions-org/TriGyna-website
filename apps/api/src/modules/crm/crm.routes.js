const express = require("express");
const leadRoutes = require("./lead.routes");
const {
  getCrmOverview,
  getCrmPipeline,
  getCrmStages,
  getCrmReports,
  checkDuplicates,
  listFollowUps,
  addFollowUp,
  completeFollowUp,
} = require("./lead.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("owner", "admin", "crm", "reception"));

// CRM Meta, Pipeline & Aggregations
router.get("/overview", getCrmOverview);
router.get("/dashboard", getCrmOverview);
router.get("/pipeline", getCrmPipeline);
router.get("/stages", getCrmStages);
router.get("/reports", getCrmReports);
router.get("/reports/conversions", getCrmReports);
router.get("/check-duplicates", checkDuplicates);

// Follow-ups Hub
router.get("/follow-ups", listFollowUps);
router.post("/follow-ups", addFollowUp);
router.patch("/follow-ups/:id", completeFollowUp);
router.patch("/follow-ups/:id/complete", completeFollowUp);
router.post("/follow-ups/:id/complete", completeFollowUp);

// Mount nested leads router
router.use("/leads", leadRoutes);

module.exports = router;

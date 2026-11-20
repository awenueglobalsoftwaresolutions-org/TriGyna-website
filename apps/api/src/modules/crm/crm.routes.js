const express = require("express");
const leadRoutes = require("./lead.routes");
const {
  getCrmOverview,
  getCrmPipeline,
  getSalesDashboardOverview,
  getSalesTeamRoster,
  getCrmStages,
  getCrmReports,
  checkDuplicates,
  listFollowUps,
  addFollowUp,
  completeFollowUp,
  handleExternalPartnerLead,
  importLeadsPreview,
  importLeadsExecute,
  exportLeadsCsv,
} = require("./lead.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Public / Partner API Ingestion endpoint (Secured with x-api-key)
router.post("/leads/external", handleExternalPartnerLead);
router.post("/external/leads", handleExternalPartnerLead);

router.use(requireAuth);
router.use(requireRole("owner", "admin", "crm", "sales", "reception"));

// CRM Meta, Pipeline & Aggregations
router.get("/sales-dashboard", getSalesDashboardOverview);
router.get("/overview", getCrmOverview);
router.get("/dashboard", getCrmOverview);
router.get("/pipeline", getCrmPipeline);
router.get("/team", getSalesTeamRoster);
router.get("/stages", getCrmStages);
router.get("/reports", getCrmReports);
router.get("/reports/conversions", getCrmReports);
router.get("/check-duplicates", checkDuplicates);

// CSV Import & Export routes
router.post("/import/preview", importLeadsPreview);
router.post("/import/execute", importLeadsExecute);
router.get("/export", exportLeadsCsv);

// Follow-ups Hub
router.get("/follow-ups", listFollowUps);
router.post("/follow-ups", addFollowUp);
router.patch("/follow-ups/:id", completeFollowUp);
router.patch("/follow-ups/:id/complete", completeFollowUp);
router.post("/follow-ups/:id/complete", completeFollowUp);

// Mount nested leads router
router.use("/leads", leadRoutes);

module.exports = router;

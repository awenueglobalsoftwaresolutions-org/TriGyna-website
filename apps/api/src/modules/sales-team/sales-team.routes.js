const express = require("express");
const controller = require("./sales-team.controller");
const salesDashboardController = require("./sales-dashboard.controller");
const salesCrmController = require("./sales-crm.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("owner", "admin", "crm", "sales"));

/**
 * ----------------------------------------------------------------------
 * 1. DASHBOARD OVERVIEW & WIDGET APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/dashboard/overview", salesDashboardController.getDashboardOverview);
router.get("/dashboard/kpis", salesDashboardController.getKpis);
router.get("/dashboard/performance", salesDashboardController.getPerformance);
router.get("/dashboard/targets", salesDashboardController.getTargets);
router.get("/dashboard/lead-sources", salesDashboardController.getLeadSources);
router.get("/dashboard/recent-leads", salesDashboardController.getRecentLeads);
router.get("/dashboard/tasks", salesDashboardController.getTasks);
router.get("/dashboard/upcoming-followups", salesDashboardController.getUpcomingFollowups);

// Legacy/Compatibility aliases
router.get("/overview", controller.getOverview);
router.get("/stats", controller.getOverview);
router.get("/performance-trend", controller.getPerformanceTrend);
router.get("/quota-progress", controller.getQuotaProgress);

/**
 * ----------------------------------------------------------------------
 * 2. LEADS APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/leads", salesCrmController.listLeads);
router.post("/leads", salesCrmController.createLead);
router.get("/leads/distribution", controller.getLeadDistribution);
router.post("/leads/bulk-assign", controller.bulkAssignLeads);
router.get("/leads/:leadId", salesCrmController.getLeadById);
router.patch("/leads/:leadId", salesCrmController.updateLead);
router.patch("/leads/:leadId/stage", salesCrmController.updateLeadStage);
router.post("/leads/:leadId/notes", salesCrmController.addLeadNote);
router.get("/leads/:leadId/activities", salesCrmController.getLeadActivities);
router.post("/leads/:leadId/convert", salesCrmController.convertLead);

/**
 * ----------------------------------------------------------------------
 * 3. FOLLOW-UP APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/followups", salesCrmController.listFollowups);
router.post("/followups", salesCrmController.createFollowup);
router.get("/followups/:followupId", salesCrmController.getFollowupById);
router.patch("/followups/:followupId", salesCrmController.updateFollowup);
router.patch("/followups/:followupId/complete", salesCrmController.completeFollowup);
router.patch("/followups/:followupId/reschedule", salesCrmController.rescheduleFollowup);

/**
 * ----------------------------------------------------------------------
 * 4. TASK APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/tasks", salesCrmController.listTasks);
router.post("/tasks", salesCrmController.createTask);
router.patch("/tasks/:taskId", salesCrmController.updateTask);
router.patch("/tasks/:taskId/complete", salesCrmController.completeTask);

/**
 * ----------------------------------------------------------------------
 * 5. APPOINTMENT APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/appointments", salesCrmController.listAppointments);
router.post("/appointments", salesCrmController.createAppointment);
router.get("/appointments/:appointmentId", salesCrmController.getAppointmentById);
router.patch("/appointments/:appointmentId", salesCrmController.updateAppointment);

/**
 * ----------------------------------------------------------------------
 * 6. PACKAGE APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/packages", salesCrmController.listPackages);
router.get("/packages/:packageId", salesCrmController.getPackageById);
router.post("/packages/:packageId/share", salesCrmController.sharePackage);

/**
 * ----------------------------------------------------------------------
 * 7. PAYMENT & INVOICE APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/payments", salesCrmController.listPayments);
router.post("/payments/payment-link", salesCrmController.createPaymentLink);
router.get("/invoices", salesCrmController.listInvoices);
router.get("/invoices/:invoiceId", salesCrmController.getInvoiceById);

/**
 * ----------------------------------------------------------------------
 * 8. COMMUNICATION APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/communications", salesCrmController.listCommunications);
router.post("/communications/whatsapp/send", salesCrmController.sendWhatsAppMessage);
router.get("/communications/:conversationId", salesCrmController.getConversationMessages);

/**
 * ----------------------------------------------------------------------
 * 9. SUPPORT APIS (Prompt Section 21)
 * ----------------------------------------------------------------------
 */
router.get("/support-tickets", salesCrmController.listSupportTickets);
router.post("/support-tickets", salesCrmController.createSupportTicket);
router.get("/support-tickets/:ticketId", salesCrmController.getSupportTicketById);

/**
 * ----------------------------------------------------------------------
 * 10. SALES TEAM ROSTER & TARGETS (Prompt Section 18)
 * ----------------------------------------------------------------------
 */
router.get("/members", controller.getMembers);
router.post("/members", controller.addMember);
router.get("/eligible-candidates", controller.getEligibleStaffCandidates);
router.get("/members/:memberId", controller.getMemberDetails);
router.patch("/members/:memberId", controller.updateMember);
router.post("/members/:memberId/activate", controller.activateMember);
router.post("/members/:memberId/deactivate", controller.deactivateMember);

router.get("/targets", controller.getTargets);
router.post("/targets", controller.createTarget);

router.get("/performance", controller.getPerformanceAnalytics);
router.get("/performance/leaderboard", controller.getPerformanceAnalytics);
router.get("/activity-logs", controller.getActivityLogs);

router.get("/settings", controller.getTeamSettings);
router.patch("/settings", controller.updateTeamSettings);

router.get("/export", controller.exportSalesCsv);

module.exports = router;

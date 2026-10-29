const express = require("express");
const {
  getAdminOverview,
  getAdminTrends,
  getAdminRecentActivity,
  getAdminActionCenter,
  getAdminDomainReports,
  getAdminSystemHealth,
} = require("./admin.dashboard.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

// Domain routers to alias for complete /api/v1/admin/* REST contract
const patientRoutes = require("../patients/patient.routes");
const doctorRoutes = require("../doctors/doctor.routes");
const appointmentRoutes = require("../appointments/appointment.routes");
const leadRoutes = require("../crm/lead.routes");
const crmRoutes = require("../crm/crm.routes");
const hrmsRoutes = require("../hrms/hrms.routes");
const invoiceRoutes = require("../billing/invoice.routes");
const receiptRoutes = require("../billing/receipt.routes");
const paymentRoutes = require("../billing/payment.routes");
const userRoutes = require("../users/user.routes");
const approvalsRoutes = require("../approvals/approvals.routes");
const auditRoutes = require("../audit/audit.routes");
const integrationsRoutes = require("../integrations/integrations.routes");
const notificationRoutes = require("../notifications/notification.routes");

const router = express.Router();

// Strict RBAC: All admin endpoints require authentication and owner/admin role
router.use(requireAuth);
router.use(requireRole("owner", "admin"));

// 1. Admin Dashboard Overview & Real-time Metrics
router.get("/dashboard/overview", getAdminOverview);
router.get("/dashboard/trends", getAdminTrends);
router.get("/dashboard/recent-activity", getAdminRecentActivity);
router.get("/dashboard/action-center", getAdminActionCenter);

// 2. Analytical Domain Reports
router.get("/reports/:domain", getAdminDomainReports);

// 3. Infrastructure & Gateways Health
router.get("/system/health", getAdminSystemHealth);

// 4. Aliased Module Routes under /api/v1/admin/*
router.use("/patients", patientRoutes);
router.use("/doctors", doctorRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/crm/leads", leadRoutes);
router.use("/crm", crmRoutes);
router.use("/hrms", hrmsRoutes);
router.use(["/invoices", "/billing/invoices"], invoiceRoutes);
router.use(["/receipts", "/billing/receipts"], receiptRoutes);
router.use(["/payments", "/billing/payments"], paymentRoutes);
router.use("/users", userRoutes);
router.use("/approvals", approvalsRoutes);
router.use(["/audit", "/audit-logs"], auditRoutes);
router.use("/integrations", integrationsRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;

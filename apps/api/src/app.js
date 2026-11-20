const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const env = require("./config/env");

// Middleware
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter, enquiryLimiter } = require("./middleware/rateLimiter");
const { sendSuccess, sendError } = require("./shared/response");

// Domain Routes
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const leadRoutes = require("./modules/crm/lead.routes");
const crmRoutes = require("./modules/crm/crm.routes");
const { submitPublicEnquiry } = require("./modules/crm/lead.controller");
const hrmsRoutes = require("./modules/hrms/hrms.routes");
const doctorRoutes = require("./modules/doctors/doctor.routes");
const doctorWorkspaceRoutes = require("./modules/doctors/doctor.workspace.routes");
const patientRoutes = require("./modules/patients/patient.routes");
const patientMeRoutes = require("./modules/patients/patient.me.routes");
const appointmentRoutes = require("./modules/appointments/appointment.routes");
const clinicalRoutes = require("./modules/clinical/clinical.routes");
const reportsRoutes = require("./modules/reports/reports.routes");
const billingMasterRoutes = require("./modules/billing/billing.routes");
const invoiceRoutes = require("./modules/billing/invoice.routes");
const receiptRoutes = require("./modules/billing/receipt.routes");
const paymentRoutes = require("./modules/billing/payment.routes");
const documentVerificationRoutes = require("./modules/billing/document-verification.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const organizationRoutes = require("./modules/organization/organization.routes");
const approvalsRoutes = require("./modules/approvals/approvals.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const integrationsRoutes = require("./modules/integrations/integrations.routes");
const webhooksRoutes = require("./modules/integrations/webhooks.routes");
const automationsRoutes = require("./modules/integrations/automations.routes");
const campaignsRoutes = require("./modules/integrations/campaigns.routes");
const aiRoutes = require("./modules/integrations/ai.routes");
const calendarRoutes = require("./modules/calendar/calendar.routes");
const taskRoutes = require("./modules/tasks/task.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const packageRoutes = require("./modules/packages/package.routes");
const salesTeamRoutes = require("./modules/sales-team/sales-team.routes");
const orderRoutes = require("./modules/billing/order.routes");
const checkoutRoutes = require("./modules/billing/checkout.routes");
const serviceRoutes = require("./modules/services/service.routes");
const marketingRoutes = require("./modules/marketing/marketing.routes");
const { listFollowUps, addFollowUp, completeFollowUp } = require("./modules/crm/lead.controller");
const { requireAuth } = require("./middleware/auth");
const { requireRole } = require("./middleware/rbac");

const app = express();

// Security and utility middleware
app.use(helmet());

// Dynamic CORS configuration allowing frontend origin
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow localhost frontend on 3000 or custom origin
      if (
        (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.includes(origin)) ||
        origin === env.FRONTEND_ORIGIN ||
        origin === env.FRONTEND_URL ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: Origin not allowed"), false);
    },
    credentials: true,
  })
);

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Root health checks
app.get(["/health", "/api/v1/health"], (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  return sendSuccess(
    res,
    {
      status: "UP",
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    "TriGyna Platform Health Check OK"
  );
});

app.get(["/ready", "/api/v1/ready"], (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return sendSuccess(res, { ready: true }, "Service is ready to handle traffic");
  }
  return res.status(503).json({
    success: false,
    message: "Service unavailable: Database connection is not ready",
  });
});

// Apply rate limiting to /api/v1
app.use("/api/v1", apiLimiter);

// Public website endpoints (no auth required)
app.post(["/api/v1/public/enquiries", "/api/v1/enquiries"], enquiryLimiter, submitPublicEnquiry);
app.post("/api/v1/leads", (req, res, next) => {
  if (req.headers.authorization) {
    return leadRoutes(req, res, next);
  }
  return enquiryLimiter(req, res, () => submitPublicEnquiry(req, res, next));
});

// Follow-ups Hub Router
const followUpRouter = express.Router();
followUpRouter.use(requireAuth);
followUpRouter.use(requireRole("owner", "admin", "crm", "sales", "reception"));
followUpRouter.get("/", listFollowUps);
followUpRouter.post("/", addFollowUp);
followUpRouter.patch("/:id", completeFollowUp);
followUpRouter.patch("/:id/complete", completeFollowUp);
followUpRouter.post("/:id/complete", completeFollowUp);

// Mount domain routes under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/crm", crmRoutes);
app.use(["/api/v1/leads", "/api/v1/crm/leads"], leadRoutes);
app.use(["/api/v1/follow-ups", "/api/v1/tasks/follow-ups"], followUpRouter);
app.use("/api/v1/hrms", hrmsRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use(["/api/v1/doctor", "/api/v1/doctors/workspace"], doctorWorkspaceRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use(["/api/v1/patient", "/api/v1/patients", "/api/v1/patient-portal"], patientMeRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/clinical", clinicalRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use(["/api/v1/orders", "/api/v1/billing/orders"], orderRoutes);
app.use(["/api/v1/checkout", "/api/v1/public/checkout"], checkoutRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use(["/api/v1/billing", "/api/v1/finance"], billingMasterRoutes);
app.use(["/api/v1/invoices", "/api/v1/billing/invoices"], invoiceRoutes);
app.use(["/api/v1/receipts", "/api/v1/billing/receipts"], receiptRoutes);
app.use(["/api/v1/payments", "/api/v1/billing/payments"], paymentRoutes);
app.use(["/api/v1/public/document-verification", "/api/v1/public/verify-document", "/api/v1/verify-document"], documentVerificationRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/organization", organizationRoutes);
app.use("/api/v1/approvals", approvalsRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/integrations", integrationsRoutes);
app.use(["/api/v1/automations", "/api/v1/automation"], automationsRoutes);
app.use(["/api/v1/whatsapp/campaigns", "/api/v1/campaigns"], campaignsRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use(["/api/v1/webhooks", "/webhooks"], webhooksRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/packages", packageRoutes);
app.use(["/api/v1/sales-team", "/api/v1/sales"], salesTeamRoutes);
app.use("/api/v1/marketing", marketingRoutes);

// Catch-all for undefined routes
app.use("*", (req, res) => {
  return sendError(res, {
    statusCode: 404,
    code: "NOT_FOUND",
    message: `Endpoint '${req.originalUrl}' does not exist on this server.`,
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;

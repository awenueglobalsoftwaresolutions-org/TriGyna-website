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
const invoiceRoutes = require("./modules/billing/invoice.routes");
const receiptRoutes = require("./modules/billing/receipt.routes");
const paymentRoutes = require("./modules/billing/payment.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const organizationRoutes = require("./modules/organization/organization.routes");
const approvalsRoutes = require("./modules/approvals/approvals.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const integrationsRoutes = require("./modules/integrations/integrations.routes");
const webhooksRoutes = require("./modules/integrations/webhooks.routes");
const calendarRoutes = require("./modules/calendar/calendar.routes");
const taskRoutes = require("./modules/tasks/task.routes");
const adminRoutes = require("./modules/admin/admin.routes");

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
        origin === env.FRONTEND_ORIGIN ||
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
app.use(express.json({ limit: "1mb" }));
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
app.post("/api/v1/public/enquiries", enquiryLimiter, submitPublicEnquiry);

// Mount domain routes under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/crm", crmRoutes);
app.use("/api/v1/crm/leads", leadRoutes);
app.use("/api/v1/hrms", hrmsRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use(["/api/v1/doctor", "/api/v1/doctors/workspace"], doctorWorkspaceRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use(["/api/v1/patient", "/api/v1/patients", "/api/v1/patient-portal"], patientMeRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/clinical", clinicalRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use(["/api/v1/invoices", "/api/v1/billing/invoices"], invoiceRoutes);
app.use(["/api/v1/receipts", "/api/v1/billing/receipts"], receiptRoutes);
app.use(["/api/v1/payments", "/api/v1/billing/payments"], paymentRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/organization", organizationRoutes);
app.use("/api/v1/approvals", approvalsRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/integrations", integrationsRoutes);
app.use(["/api/v1/webhooks", "/webhooks"], webhooksRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/admin", adminRoutes);

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

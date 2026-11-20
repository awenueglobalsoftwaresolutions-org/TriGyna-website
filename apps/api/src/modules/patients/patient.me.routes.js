const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  getMyProfile,
  updateMyProfile,
  getMyDashboard,
  getMyTimeline,
  getMyFollowUps,
  getMyDocuments,
  uploadMyDocument,
  getMyRefundRequests,
  createMyRefundRequest,
  getMySupportTickets,
  createSupportTicket,
  replySupportTicket,
  getNotificationPreferences,
  updateNotificationPreferences,
  getMyAppointments,
  getMyConsultations,
  getMyPrescriptions,
  getMyInvoices,
  getMyPayments,
  getMyReceipts,
  getMyOrders,
  getMyOnboardingStatus,
  getDocumentAccessLink,
  downloadMyDocument,
  createPatientCrmRequest,
  getMyBillingSummary,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSupportTicketDetails,
  linkPatientChart,
  requestChartLinkOtp,
  confirmChartLinkOtp,
  changeMyPassword,
} = require("./patient.me.controller");
const { createAppointment } = require("../appointments/appointment.controller");
const { createOrderRefundRequest } = require("../billing/order.controller");

const router = express.Router();

router.use(requireAuth);

// Core patient profile & dashboard
router.get(["/me", "/me/profile"], getMyProfile);
router.patch(["/me", "/me/profile"], updateMyProfile);
router.put(["/me", "/me/profile"], updateMyProfile);
router.patch("/me/password", changeMyPassword);
router.post("/me/link-chart", linkPatientChart);
router.post("/me/link-chart/request-otp", requestChartLinkOtp);
router.post("/me/link-chart/confirm-otp", confirmChartLinkOtp);
router.post("/me/request-otp", requestChartLinkOtp);
router.post("/me/confirm-otp", confirmChartLinkOtp);
router.get("/me/dashboard", getMyDashboard);
router.get("/me/timeline", getMyTimeline);
router.get(["/onboarding", "/me/onboarding"], getMyOnboardingStatus);

// Orders
router.get(["/orders", "/me/orders"], getMyOrders);
router.post(["/orders/:id/refund-requests", "/me/orders/:id/refund-requests"], createOrderRefundRequest);

// Appointments
router.get(["/appointments", "/me/appointments"], getMyAppointments);
router.post(["/appointments", "/me/appointments"], createAppointment);

// Clinical care & records
router.get(["/consultations", "/me/consultations"], getMyConsultations);
router.get(["/prescriptions", "/me/prescriptions"], getMyPrescriptions);
router.get(["/follow-ups", "/me/follow-ups"], getMyFollowUps);
router.get(["/documents", "/me/documents"], getMyDocuments);
router.post(["/documents", "/me/documents"], uploadMyDocument);
router.get(["/documents/:id/access", "/me/documents/:id/access"], getDocumentAccessLink);
router.get(["/documents/:id/download", "/me/documents/:id/download"], downloadMyDocument);

// Billing, Invoices & Receipts
router.get(["/invoices", "/me/invoices"], getMyInvoices);
router.get(["/payments", "/me/payments"], getMyPayments);
router.get(["/receipts", "/me/receipts"], getMyReceipts);
router.get(["/billing-summary", "/me/billing-summary"], getMyBillingSummary);
router.get(["/refund-requests", "/me/refund-requests"], getMyRefundRequests);
router.post(["/refund-requests", "/me/refund-requests"], createMyRefundRequest);

// Reverse CRM Workflow (Patient Dashboard Requests)
router.post(["/requests", "/me/requests"], createPatientCrmRequest);

// Support & Inquiries
router.get(["/support-tickets", "/me/support-tickets"], getMySupportTickets);
router.get(["/support-tickets/:id", "/me/support-tickets/:id"], getSupportTicketDetails);
router.post(["/support-tickets", "/me/support-tickets"], createSupportTicket);
router.post(["/support-tickets/:id/replies", "/me/support-tickets/:id/replies"], replySupportTicket);

// Notification settings & alerts
router.get(["/notifications", "/me/notifications"], getMyNotifications);
router.patch(["/notifications/read-all", "/me/notifications/read-all"], markAllNotificationsRead);
router.patch(["/notifications/:id/read", "/me/notifications/:id/read"], markNotificationRead);
router.get(["/notifications/preferences", "/me/notifications/preferences"], getNotificationPreferences);
router.patch(["/notifications/preferences", "/me/notifications/preferences"], updateNotificationPreferences);

module.exports = router;

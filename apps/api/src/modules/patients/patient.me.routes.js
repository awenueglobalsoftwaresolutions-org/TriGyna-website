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
  getMyReceipts,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSupportTicketDetails,
  linkPatientChart,
  requestChartLinkOtp,
  confirmChartLinkOtp,
  changeMyPassword,
} = require("./patient.me.controller");

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

// Appointments
router.get("/me/appointments", getMyAppointments);

// Clinical care & records
router.get("/me/consultations", getMyConsultations);
router.get("/me/prescriptions", getMyPrescriptions);
router.get("/me/follow-ups", getMyFollowUps);
router.get("/me/documents", getMyDocuments);
router.post("/me/documents", uploadMyDocument);

// Billing, Invoices & Refunds
router.get("/me/invoices", getMyInvoices);
router.get("/me/receipts", getMyReceipts);
router.get("/me/refund-requests", getMyRefundRequests);
router.post("/me/refund-requests", createMyRefundRequest);

// Support & Inquiries
router.get("/me/support-tickets", getMySupportTickets);
router.get("/me/support-tickets/:id", getSupportTicketDetails);
router.post("/me/support-tickets", createSupportTicket);
router.post("/me/support-tickets/:id/replies", replySupportTicket);

// Notification settings & alerts
router.get("/me/notifications", getMyNotifications);
router.patch("/me/notifications/read-all", markAllNotificationsRead);
router.patch("/me/notifications/:id/read", markNotificationRead);
router.get("/me/notifications/preferences", getNotificationPreferences);
router.patch("/me/notifications/preferences", updateNotificationPreferences);

module.exports = router;

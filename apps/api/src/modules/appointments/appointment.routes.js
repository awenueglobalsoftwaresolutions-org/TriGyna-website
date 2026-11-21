const express = require("express");
const {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  getAvailability,
  updateMeetingLink,
  getMeetingDetails,
  getAppointmentStats,
  getCalendarData,
  checkInAppointment,
  startConsultation,
  completeAppointment,
  markNoShow,
  exportAppointmentsCsv,
} = require("./appointment.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// Static query endpoints (must precede /:id)
router.get("/stats", getAppointmentStats);
router.get("/calendar", getCalendarData);
router.get("/availability", getAvailability);
router.get("/export", requireRole("owner", "admin", "reception", "doctor", "sales", "crm"), exportAppointmentsCsv);
router.get("/", listAppointments);
router.post("/", createAppointment);

// Lifecycle actions
router.post("/:id/check-in", requireRole("owner", "admin", "reception", "doctor"), checkInAppointment);
router.post("/:id/start-consultation", requireRole("owner", "admin", "doctor"), startConsultation);
router.post("/:id/complete", requireRole("owner", "admin", "doctor"), completeAppointment);
router.post("/:id/no-show", requireRole("owner", "admin", "reception", "doctor"), markNoShow);

// Status updates & video links
router.patch("/:id/status", requireRole("owner", "admin", "reception", "doctor", "sales", "crm"), updateAppointmentStatus);
router.patch("/:id", requireRole("owner", "admin", "reception", "doctor", "sales", "crm"), updateAppointmentStatus);
router.put("/:id/meeting-link", requireRole("owner", "admin", "doctor"), updateMeetingLink);
router.patch("/:id/meeting-link", requireRole("owner", "admin", "doctor"), updateMeetingLink);
router.get("/:id/meeting-details", requireRole("owner", "admin", "doctor", "sales", "crm", "patient"), getMeetingDetails);
router.get("/:id/meeting", requireRole("owner", "admin", "doctor", "sales", "crm", "patient"), getMeetingDetails);
router.post("/:id/reschedule", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), rescheduleAppointment);
router.put("/:id/reschedule", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), rescheduleAppointment);
router.post("/:id/cancel", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), cancelAppointment);
router.delete("/:id", requireRole("owner", "admin", "reception", "doctor", "sales", "crm", "patient"), cancelAppointment);

module.exports = router;


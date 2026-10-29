const express = require("express");
const {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  getAvailability,
} = require("./appointment.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

router.get("/availability", getAvailability);
router.get("/", listAppointments);
router.post("/", createAppointment);
router.patch("/:id/status", requireRole("owner", "admin", "reception", "doctor"), updateAppointmentStatus);
router.patch("/:id", requireRole("owner", "admin", "reception", "doctor"), updateAppointmentStatus);
router.post("/:id/reschedule", requireRole("owner", "admin", "reception", "doctor", "patient"), rescheduleAppointment);
router.put("/:id/reschedule", requireRole("owner", "admin", "reception", "doctor", "patient"), rescheduleAppointment);
router.post("/:id/cancel", requireRole("owner", "admin", "reception", "doctor", "patient"), cancelAppointment);
router.delete("/:id", requireRole("owner", "admin", "reception", "doctor", "patient"), cancelAppointment);

module.exports = router;


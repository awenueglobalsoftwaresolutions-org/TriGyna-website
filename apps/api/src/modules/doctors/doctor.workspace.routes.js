const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const {
  getDoctorDashboard,
  getDoctorAppointments,
  getDoctorAppointmentById,
  updateDoctorAppointmentStatus,
  getDoctorPatients,
  getDoctorPatientById,
  getDoctorPatientHistory,
  createDoctorConsultation,
  listDoctorConsultations,
  getDoctorConsultationById,
  updateDoctorConsultationDraft,
  finalizeDoctorConsultation,
  amendDoctorConsultation,
  saveDoctorPrescription,
  listDoctorPrescriptions,
  getDoctorPrescriptionById,
  getDoctorFollowUps,
  createDoctorFollowUp,
  updateDoctorFollowUp,
  getDoctorTasks,
  toggleDoctorTask,
  getDoctorReports,
  getDoctorNotifications,
  markDoctorNotificationRead,
  markAllDoctorNotificationsRead,
  getDoctorProfile,
  updateDoctorAvailability,
} = require("./doctor.workspace.controller");

const router = express.Router();

// Enforce authentication & role restrictions (doctor, owner, admin)
router.use(requireAuth);
router.use(requireRole("doctor", "owner", "admin"));

// Dashboard & clinical summary
router.get("/dashboard", getDoctorDashboard);

// Appointments
router.get("/appointments", getDoctorAppointments);
router.get("/appointments/:id", getDoctorAppointmentById);
router.patch("/appointments/:id/status", updateDoctorAppointmentStatus);

// Patients
router.get("/patients", getDoctorPatients);
router.get("/patients/:id", getDoctorPatientById);
router.get("/patients/:id/history", getDoctorPatientHistory);

// Consultations
router.get("/consultations", listDoctorConsultations);
router.post("/consultations", createDoctorConsultation);
router.get("/consultations/:id", getDoctorConsultationById);
router.patch("/consultations/:id", updateDoctorConsultationDraft);
router.post("/consultations/:id/finalize", finalizeDoctorConsultation);
router.post("/consultations/:id/amend", amendDoctorConsultation);
router.post("/consultations/:id/amendments", amendDoctorConsultation);
router.post("/consultations/:id/prescriptions", saveDoctorPrescription);

// Prescriptions
router.get("/prescriptions", listDoctorPrescriptions);
router.get("/prescriptions/:id", getDoctorPrescriptionById);

// Follow-ups
router.get("/follow-ups", getDoctorFollowUps);
router.post("/follow-ups", createDoctorFollowUp);
router.patch("/follow-ups/:id", updateDoctorFollowUp);

// Clinical Tasks
router.get("/tasks", getDoctorTasks);
router.patch("/tasks/:id/toggle", toggleDoctorTask);

// Reports
router.get("/reports", getDoctorReports);

// Notifications
router.get("/notifications", getDoctorNotifications);
router.patch("/notifications/read-all", markAllDoctorNotificationsRead);
router.patch("/notifications/:id/read", markDoctorNotificationRead);

// Profile & Availability
router.get("/profile", getDoctorProfile);
router.patch("/availability", updateDoctorAvailability);

module.exports = router;

const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const { streamDoctorRealtime } = require("../realtime/realtime.service");
const {
  getDoctorDashboard,
  getDoctorDashboardStats,
  getDoctorDashboardActivity,
  getDoctorAppointmentSummary,
  getDoctorCalendarSummary,
  exportDoctorAppointments,
  createDoctorAppointment,
  getDoctorAppointments,
  getDoctorAppointmentById,
  updateDoctorAppointment,
  updateDoctorAppointmentStatus,
  startDoctorConsultation,
  updateDoctorAppointmentOutcome,
  requestAppointmentReschedule,
  requestAppointmentCancellation,
  getDoctorPatients,
  getDoctorPatientSummary,
  createDoctorPatient,
  exportDoctorPatients,
  getDoctorPatientOverview,
  getDoctorPatientDocuments,
  getDoctorPatientAllergies,
  getDoctorPatientMedications,
  getDoctorPatientFollowUps,
  getDoctorPatientById,
  getDoctorPatientHistory,
  getDoctorPatientConsultations,
  getDoctorPatientPrescriptions,
  getDoctorPatientAppointments,
  getDoctorConsultationSummary,
  getDoctorConsultationDiagnoses,
  getDoctorEligibleAppointments,
  createDoctorConsultation,
  listDoctorConsultations,
  getDoctorConsultationById,
  getDoctorConsultationRecord,
  updateDoctorConsultationDraft,
  exportDoctorConsultations,
  finalizeDoctorConsultation,
  amendDoctorConsultation,
  saveDoctorPrescription,
  createGeneralDoctorPrescription,
  finalizeDoctorPrescription,
  listDoctorPrescriptions,
  getDoctorPrescriptionById,
  updateDoctorPrescriptionDraft,
  amendDoctorPrescription,
  getDoctorMedicalHistory,
  getDoctorMedicalHistoryRecord,
  getDoctorFollowUpStats,
  getDoctorFollowUpSettings,
  updateDoctorFollowUpSettings,
  searchDoctorFollowUpPatients,
  getDoctorFollowUps,
  getDoctorFollowUpById,
  createDoctorFollowUp,
  updateDoctorFollowUp,
  completeDoctorFollowUp,
  rescheduleDoctorFollowUp,
  cancelDoctorFollowUp,
  getDoctorTasks,
  toggleDoctorTask,
  getDoctorReports,
  getDoctorAppointmentReport,
  getDoctorConsultationReport,
  getDoctorPrescriptionReport,
  getDoctorFollowUpReport,
  getDoctorAvailabilityReport,
  getDoctorNotifications,
  getDoctorUnreadNotificationCount,
  markDoctorNotificationRead,
  markAllDoctorNotificationsRead,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorAvailability,
  updateDoctorAvailability,
  requestDoctorLeave,
  getDoctorLeaveRequests,
  getDoctorBilling,
  getDoctorSchedule,
} = require("./doctor.workspace.controller");

const router = express.Router();

// Realtime SSE stream (authenticated via token query param or Bearer header)
router.get("/realtime/stream", streamDoctorRealtime);

// Enforce authentication & role restrictions (doctor, owner, admin)
router.use(requireAuth);
router.use(requireRole("doctor", "owner", "admin"));

// Dashboard & clinical summary
router.get("/dashboard", getDoctorDashboard);
router.get("/dashboard/stats", getDoctorDashboardStats);
router.get("/dashboard/activity", getDoctorDashboardActivity);

// Appointments
router.get("/appointments/summary", getDoctorAppointmentSummary);
router.get("/appointments/calendar-summary", getDoctorCalendarSummary);
router.get("/appointments/export", exportDoctorAppointments);
router.post("/appointments/export", exportDoctorAppointments);
router.post("/appointments", createDoctorAppointment);
router.get("/appointments", getDoctorAppointments);
router.get("/appointments/:id", getDoctorAppointmentById);
router.patch("/appointments/:id", updateDoctorAppointment);
router.patch("/appointments/:id/status", updateDoctorAppointmentStatus);
router.post("/appointments/:id/start-consultation", startDoctorConsultation);
router.patch("/appointments/:id/outcome", updateDoctorAppointmentOutcome);
router.put("/appointments/:id/meeting-link", require("../appointments/appointment.controller").updateMeetingLink);
router.patch("/appointments/:id/meeting-link", require("../appointments/appointment.controller").updateMeetingLink);
router.post("/appointments/:id/reschedule-request", requestAppointmentReschedule);
router.post("/appointments/:id/cancellation-request", requestAppointmentCancellation);

// Patients
router.get("/patients/summary", getDoctorPatientSummary);
router.get("/patients/export", exportDoctorPatients);
router.post("/patients/export", exportDoctorPatients);
router.post("/patients", createDoctorPatient);
router.get("/patients", getDoctorPatients);
router.get("/patients/:id/overview", getDoctorPatientOverview);
router.get("/patients/:id/documents", getDoctorPatientDocuments);
router.get("/patients/:id/allergies", getDoctorPatientAllergies);
router.get("/patients/:id/medications", getDoctorPatientMedications);
router.get("/patients/:id/follow-ups", getDoctorPatientFollowUps);
router.get("/patients/:id", getDoctorPatientById);
router.get(["/patients/:id/medical-history", "/patients/:id/history"], getDoctorPatientHistory);
router.get("/patients/:id/consultations", getDoctorPatientConsultations);
router.get("/patients/:id/prescriptions", getDoctorPatientPrescriptions);
router.get("/patients/:id/appointments", getDoctorPatientAppointments);

// Consultations
router.get("/consultations/summary", getDoctorConsultationSummary);
router.get("/consultations/diagnoses", getDoctorConsultationDiagnoses);
router.get("/consultations/eligible-appointments", getDoctorEligibleAppointments);
router.get("/consultations/export", exportDoctorConsultations);
router.post("/consultations/export", exportDoctorConsultations);
router.get("/consultations", listDoctorConsultations);
router.post("/consultations", createDoctorConsultation);
router.get("/consultations/:id/record", getDoctorConsultationRecord);
router.get("/consultations/:id", getDoctorConsultationById);
router.patch(["/consultations/:id/autosave", "/consultations/:id/draft", "/consultations/:id"], updateDoctorConsultationDraft);
router.post("/consultations/:id/finalize", finalizeDoctorConsultation);
router.post("/consultations/:id/amend", amendDoctorConsultation);
router.post("/consultations/:id/amendments", amendDoctorConsultation);
router.post("/consultations/:id/prescriptions", saveDoctorPrescription);

// Prescriptions
router.get("/prescriptions", listDoctorPrescriptions);
router.post("/prescriptions", createGeneralDoctorPrescription);
router.get("/prescriptions/:id", getDoctorPrescriptionById);
router.patch("/prescriptions/:id", updateDoctorPrescriptionDraft);
router.post("/prescriptions/:id/finalize", finalizeDoctorPrescription);
router.post("/prescriptions/:id/amend", amendDoctorPrescription);
router.get(["/prescriptions/:id/pdf", "/prescriptions/:id/document"], require("../clinical/clinical.controller").downloadPrescriptionPdf);

// Medical History
router.get("/medical-history", getDoctorMedicalHistory);
router.get("/medical-history/:id", getDoctorMedicalHistoryRecord);

// Follow-ups & Continuity of Care
router.get("/follow-ups/stats", getDoctorFollowUpStats);
router.get("/follow-ups/settings", getDoctorFollowUpSettings);
router.patch("/follow-ups/settings", updateDoctorFollowUpSettings);
router.get("/follow-ups/patients/search", searchDoctorFollowUpPatients);
router.get("/follow-ups", getDoctorFollowUps);
router.get("/follow-ups/:id", getDoctorFollowUpById);
router.post("/follow-ups", createDoctorFollowUp);
router.patch("/follow-ups/:id", updateDoctorFollowUp);
router.post("/follow-ups/:id/complete", completeDoctorFollowUp);
router.patch("/follow-ups/:id/complete", completeDoctorFollowUp);
router.post("/follow-ups/:id/reschedule", rescheduleDoctorFollowUp);
router.post("/follow-ups/:id/cancel", cancelDoctorFollowUp);

// Clinical Tasks
router.get("/tasks", getDoctorTasks);
router.patch("/tasks/:id/toggle", toggleDoctorTask);

// Reports
router.get("/reports/appointments", getDoctorAppointmentReport);
router.get("/reports/consultations", getDoctorConsultationReport);
router.get("/reports/prescriptions", getDoctorPrescriptionReport);
router.get("/reports/follow-ups", getDoctorFollowUpReport);
router.get("/reports/availability", getDoctorAvailabilityReport);
router.get(["/reports", "/reports/:reportType"], getDoctorReports);

// Notifications
router.get("/notifications", getDoctorNotifications);
router.get("/notifications/unread-count", getDoctorUnreadNotificationCount);
router.patch("/notifications/read-all", markAllDoctorNotificationsRead);
router.post("/notifications/read-all", markAllDoctorNotificationsRead);
router.patch("/notifications/:id/read", markDoctorNotificationRead);

// Profile & Availability
router.get("/profile", getDoctorProfile);
router.patch("/profile", updateDoctorProfile);
router.get("/availability", getDoctorAvailability);
router.patch("/availability", updateDoctorAvailability);
router.get("/schedule", getDoctorSchedule);

// Leave Requests
router.get("/leave-requests", getDoctorLeaveRequests);
router.post("/leave-requests", requestDoctorLeave);

// Consultation Billing
router.get("/billing", getDoctorBilling);

module.exports = router;

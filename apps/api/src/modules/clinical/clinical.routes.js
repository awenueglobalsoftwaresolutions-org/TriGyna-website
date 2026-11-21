const express = require("express");
const {
  getConsultationStats,
  listConsultations,
  getConsultationById,
  getConsultationByAppointment,
  saveConsultationDraft,
  updateConsultationDraft,
  finalizeConsultation,
  amendConsultation,
  getConsultationAuditTrail,
  getDiagnosesCatalog,
  exportConsultationsCsv,
  listTreatmentPlans,
  createTreatmentPlan,
  updateTreatmentPlan,
  completeTreatmentPlan,
  discontinueTreatmentPlan,
  listPrescriptions,
  savePrescription,
  getPrescriptionsForPatient,
  downloadPrescriptionPdf,
  getPatientClinicalTimeline,
  getConsultationDocuments,
  uploadConsultationDocument,
  getClinicalAnalytics,
} = require("./clinical.controller");
const {
  listFollowUps,
  getFollowUpStats,
  getFollowUpCalendar,
  getUpcomingFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  rescheduleFollowUp,
  markMissedFollowUp,
  sendFollowUpReminder,
  exportFollowUpsCsv,
} = require("./followup.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// 1. Diagnostics, Stats, Catalogs & Exports (MUST be declared before :id parameters)
router.get("/consultations/stats", requireRole("owner", "admin", "doctor"), getConsultationStats);
router.get("/consultations/export", requireRole("owner", "admin", "doctor"), exportConsultationsCsv);
router.get("/diagnoses", requireRole("owner", "admin", "doctor"), getDiagnosesCatalog);
router.get("/reports/analytics", requireRole("owner", "admin", "doctor"), getClinicalAnalytics);

// 2. Consultations Core CRUD & Lifecycles
router.get("/consultations", requireRole("owner", "admin", "doctor", "patient"), listConsultations);
router.get(["/consultations/appointment/:appointmentId", "/appointments/:appointmentId/consultation"], requireRole("owner", "admin", "doctor", "patient"), getConsultationByAppointment);
router.get("/consultations/:id", requireRole("owner", "admin", "doctor", "patient"), getConsultationById);
router.post("/consultations", requireRole("owner", "admin", "doctor"), saveConsultationDraft);
router.patch("/consultations/:id", requireRole("owner", "admin", "doctor"), updateConsultationDraft);
router.post("/consultations/:id/finalize", requireRole("owner", "admin", "doctor"), finalizeConsultation);
router.post("/consultations/:id/amendments", requireRole("owner", "admin", "doctor"), amendConsultation);
router.get("/consultations/:id/audit", requireRole("owner", "admin", "doctor"), getConsultationAuditTrail);
router.get("/consultations/:id/documents", requireRole("owner", "admin", "doctor"), getConsultationDocuments);
router.post("/consultations/:id/documents", requireRole("owner", "admin", "doctor"), uploadConsultationDocument);

// 3. Treatment Plans
router.get("/treatment-plans", requireRole("owner", "admin", "doctor", "patient"), listTreatmentPlans);
router.post("/treatment-plans", requireRole("owner", "admin", "doctor"), createTreatmentPlan);
router.patch("/treatment-plans/:id", requireRole("owner", "admin", "doctor"), updateTreatmentPlan);
router.post("/treatment-plans/:id/complete", requireRole("owner", "admin", "doctor"), completeTreatmentPlan);
router.post("/treatment-plans/:id/discontinue", requireRole("owner", "admin", "doctor"), discontinueTreatmentPlan);

// 4. Digital Prescriptions
router.get("/prescriptions", requireRole("owner", "admin", "doctor", "patient"), listPrescriptions);
router.post("/prescriptions", requireRole("owner", "admin", "doctor"), savePrescription);
router.get("/prescriptions/:id/pdf", requireRole("owner", "admin", "doctor", "patient"), downloadPrescriptionPdf);
router.get("/prescriptions/patient/:patientId", requireRole("owner", "admin", "doctor", "patient"), getPrescriptionsForPatient);

// 5. Patient EHR Timeline
router.get("/patients/:patientId/timeline", requireRole("owner", "admin", "doctor", "patient"), getPatientClinicalTimeline);

// 6. Follow-ups & Recovery Management
router.get("/follow-ups/stats", requireRole("owner", "admin", "doctor", "reception", "crm"), getFollowUpStats);
router.get("/follow-ups/calendar", requireRole("owner", "admin", "doctor", "reception", "crm"), getFollowUpCalendar);
router.get("/follow-ups/upcoming", requireRole("owner", "admin", "doctor", "reception", "crm"), getUpcomingFollowUps);
router.get("/follow-ups/export", requireRole("owner", "admin", "doctor", "reception", "crm"), exportFollowUpsCsv);
router.get("/follow-ups", requireRole("owner", "admin", "doctor", "reception", "crm"), listFollowUps);
router.get("/follow-ups/:id", requireRole("owner", "admin", "doctor", "reception", "crm", "patient"), getFollowUpById);
router.post("/follow-ups", requireRole("owner", "admin", "doctor", "reception"), createFollowUp);
router.patch("/follow-ups/:id", requireRole("owner", "admin", "doctor", "reception"), updateFollowUp);
router.post("/follow-ups/:id/complete", requireRole("owner", "admin", "doctor", "reception"), completeFollowUp);
router.post("/follow-ups/:id/reschedule", requireRole("owner", "admin", "doctor", "reception"), rescheduleFollowUp);
router.post("/follow-ups/:id/mark-missed", requireRole("owner", "admin", "doctor", "reception"), markMissedFollowUp);
router.post("/follow-ups/:id/remind", requireRole("owner", "admin", "doctor", "reception"), sendFollowUpReminder);

module.exports = router;

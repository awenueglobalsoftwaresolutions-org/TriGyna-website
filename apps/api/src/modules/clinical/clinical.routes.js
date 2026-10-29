const express = require("express");
const {
  listConsultations,
  getConsultationById,
  getConsultationByAppointment,
  saveConsultationDraft,
  finalizeConsultation,
  amendConsultation,
  savePrescription,
  getPrescriptionsForPatient,
} = require("./clinical.controller");
const {
  listFollowUps,
  createFollowUp,
  updateFollowUp,
} = require("./followup.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// Consultations
router.get("/consultations", requireRole("owner", "admin", "doctor", "patient"), listConsultations);
router.get(["/consultations/appointment/:appointmentId", "/appointments/:appointmentId/consultation"], requireRole("owner", "admin", "doctor", "patient"), getConsultationByAppointment);
router.get("/consultations/:id", requireRole("owner", "admin", "doctor", "patient"), getConsultationById);
router.post("/consultations", requireRole("owner", "admin", "doctor"), saveConsultationDraft);
router.post("/consultations/:id/finalize", requireRole("owner", "admin", "doctor"), finalizeConsultation);
router.post("/consultations/:id/amendments", requireRole("owner", "admin", "doctor"), amendConsultation);

// Prescriptions
router.post("/prescriptions", requireRole("owner", "admin", "doctor"), savePrescription);
router.get("/prescriptions/patient/:patientId", requireRole("owner", "admin", "doctor", "patient"), getPrescriptionsForPatient);

// Follow-ups
router.get("/follow-ups", requireRole("owner", "admin", "doctor", "reception", "crm"), listFollowUps);
router.post("/follow-ups", requireRole("owner", "admin", "doctor", "reception"), createFollowUp);
router.patch("/follow-ups/:id", requireRole("owner", "admin", "doctor", "reception"), updateFollowUp);

module.exports = router;

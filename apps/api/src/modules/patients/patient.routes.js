const express = require("express");
const {
  getPatientStats,
  listPatients,
  getPatientById,
  getPatientOverview,
  getPatientActivity,
  getPatientClinicalSummary,
  getPatientAppointments,
  getPatientConsultations,
  getPatientPrescriptions,
  getPatientTreatmentPlans,
  getPatientFollowUps,
  getPatientDocuments,
  uploadPatientDocument,
  getPatientInvoices,
  getPatientPayments,
  checkDuplicates,
  getPatientDuplicates,
  previewPatientMerge,
  executePatientMerge,
  exportPatients,
  createPatient,
  updatePatient,
  updatePatientStatus,
  deletePatientPermanently,
} = require("./patient.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// 1. Static and Query Routes (Must be before /:id)
router.get("/stats", requireRole("owner", "admin", "doctor", "reception", "crm", "sales"), getPatientStats);
router.get("/export", requireRole("owner", "admin", "reception"), exportPatients);
router.post("/duplicate-check", requireRole("owner", "admin", "reception", "crm", "sales", "doctor"), checkDuplicates);
router.post("/merge/preview", requireRole("owner", "admin"), previewPatientMerge);
router.post("/merge/execute", requireRole("owner", "admin"), executePatientMerge);

// 2. Collection Root CRUD
router.get("/", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), listPatients);
router.post("/", requireRole("owner", "admin", "reception", "crm", "sales", "doctor"), createPatient);

// 3. Specific Patient Profile Sub-resources
router.get("/:id/overview", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), getPatientOverview);
router.get("/:id/profile", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), getPatientOverview);
router.get("/:id/activity", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), getPatientActivity);
router.get("/:id/clinical-summary", requireRole("owner", "admin", "doctor", "reception", "patient"), getPatientClinicalSummary);
router.get("/:id/appointments", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), getPatientAppointments);
router.get("/:id/consultations", requireRole("owner", "admin", "doctor", "reception", "patient"), getPatientConsultations);
router.get("/:id/prescriptions", requireRole("owner", "admin", "doctor", "reception", "patient"), getPatientPrescriptions);
router.get("/:id/treatment-plans", requireRole("owner", "admin", "doctor", "reception", "patient"), getPatientTreatmentPlans);
router.get("/:id/followups", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), getPatientFollowUps);
router.get("/:id/documents", requireRole("owner", "admin", "doctor", "reception", "patient"), getPatientDocuments);
router.post("/:id/documents", requireRole("owner", "admin", "doctor", "reception"), uploadPatientDocument);
router.get("/:id/invoices", requireRole("owner", "admin", "reception", "crm", "sales", "patient"), getPatientInvoices);
router.get("/:id/payments", requireRole("owner", "admin", "reception", "crm", "sales", "patient"), getPatientPayments);
router.get("/:id/possible-duplicates", requireRole("owner", "admin", "reception", "crm", "doctor"), getPatientDuplicates);

// 4. Primary Individual Patient Actions
router.get("/:id", requireRole("owner", "admin", "doctor", "reception", "crm", "sales", "patient"), getPatientById);
router.patch("/:id/status", requireRole("owner", "admin", "reception"), updatePatientStatus);
router.patch("/:id", requireRole("owner", "admin", "reception", "doctor", "crm", "sales", "patient"), updatePatient);

// 5. Permanent Database Deletion (Strict owner/admin only)
router.delete("/:id", requireRole("owner", "admin"), deletePatientPermanently);
router.delete("/:id/permanent", requireRole("owner", "admin"), deletePatientPermanently);

module.exports = router;

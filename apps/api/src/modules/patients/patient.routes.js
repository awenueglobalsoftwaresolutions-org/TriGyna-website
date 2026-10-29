const express = require("express");
const {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatientPermanently,
} = require("./patient.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRole("owner", "admin", "doctor", "reception", "crm", "patient"), listPatients);
router.post("/", requireRole("owner", "admin", "reception", "crm", "doctor"), createPatient);
router.get("/:id", requireRole("owner", "admin", "doctor", "reception", "crm", "patient"), getPatientById);
router.patch("/:id", requireRole("owner", "admin", "reception", "doctor", "patient"), updatePatient);

// Permanent Database Deletion (Strict owner/admin only)
router.delete("/:id", requireRole("owner", "admin"), deletePatientPermanently);
router.delete("/:id/permanent", requireRole("owner", "admin"), deletePatientPermanently);

module.exports = router;


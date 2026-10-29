const express = require("express");
const {
  listDoctors,
  getDoctorById,
  createDoctorProfile,
  updateDoctorProfile,
  deleteDoctorPermanently,
} = require("./doctor.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Public/authenticated access to view doctors
router.get("/", listDoctors);
router.get("/:id", getDoctorById);

// Protected administration
router.use(requireAuth);
router.post("/", requireRole("owner", "admin"), createDoctorProfile);
router.patch("/:id", requireRole("owner", "admin", "doctor"), updateDoctorProfile);

// Permanent Database Deletion (Strict owner/admin only)
router.delete("/:id", requireRole("owner", "admin"), deleteDoctorPermanently);
router.delete("/:id/permanent", requireRole("owner", "admin"), deleteDoctorPermanently);

module.exports = router;


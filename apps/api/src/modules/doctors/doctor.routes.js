const express = require("express");
const {
  getDoctorStats,
  exportDoctorsCsv,
  listDoctors,
  getDoctorById,
  getDoctorSchedule,
  getDoctorTodaySchedule,
  getDoctorConsultations,
  getDoctorEarnings,
  createDoctorProfile,
  updateDoctorProfile,
  updateDoctorStatus,
  deleteDoctorPermanently,
} = require("./doctor.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Specific meta and aggregation routes before /:id parameter
router.get("/stats", getDoctorStats);
router.get("/export", exportDoctorsCsv);
router.get("/", listDoctors);

// Detail and sub-resource routes
router.get("/:id", getDoctorById);
router.get("/:id/schedule", getDoctorSchedule);
router.get("/:id/today-schedule", getDoctorTodaySchedule);
router.get("/:id/consultations", getDoctorConsultations);
router.get("/:id/earnings", requireAuth, requireRole("owner", "admin", "doctor"), getDoctorEarnings);

// Protected Administration & Updates
router.use(requireAuth);
router.post("/", requireRole("owner", "admin"), createDoctorProfile);
router.patch("/:id", requireRole("owner", "admin", "doctor"), updateDoctorProfile);
router.patch("/:id/status", requireRole("owner", "admin"), updateDoctorStatus);

// Permanent Database Deletion (Strict owner/admin only)
router.delete("/:id", requireRole("owner", "admin"), deleteDoctorPermanently);
router.delete("/:id/permanent", requireRole("owner", "admin"), deleteDoctorPermanently);

module.exports = router;

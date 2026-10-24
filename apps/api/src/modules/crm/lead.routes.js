const express = require("express");
const {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  updateLeadStage,
  markLeadLost,
  assignLead,
  getLeadTimeline,
  getLeadActivities,
  addLeadActivity,
  addLeadNote,
  addLeadTask,
  updateLeadTask,
  convertLeadToPatient,
  exportLeadsCsv,
  deleteLeadPermanently,
} = require("./lead.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("owner", "admin", "crm", "reception"));

// CSV export route
router.get("/export", exportLeadsCsv);

// Standard CRUD & Workflows
router.get("/", listLeads);
router.post("/", createLead);
router.get("/:id", getLeadById);
router.patch("/:id", updateLead);
router.patch("/:id/stage", updateLeadStage);
router.patch("/:id/status", updateLeadStage);
router.post("/:id/mark-lost", markLeadLost);
router.post("/:id/assign", assignLead);
router.patch("/:id/assign", assignLead);
router.get("/:id/timeline", getLeadTimeline);
router.get("/:id/activities", getLeadActivities);
router.post("/:id/activities", addLeadActivity);
router.post("/:id/notes", addLeadNote);
router.post("/:id/tasks", addLeadTask);
router.post("/:id/follow-ups", addLeadTask);
router.patch("/:id/tasks/:taskId", updateLeadTask);
router.post("/:id/convert", convertLeadToPatient);
router.post("/:id/book-appointment", convertLeadToPatient);

// Permanent Database Deletion (Strict owner/admin only)
router.delete("/:id", requireRole("owner", "admin"), deleteLeadPermanently);
router.delete("/:id/permanent", requireRole("owner", "admin"), deleteLeadPermanently);

module.exports = router;


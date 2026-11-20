const express = require("express");
const {
  getCalendarEvents,
  getCalendarEventById,
  getCalendarStats,
  getCalendarAgenda,
  getCalendarStreams,
  createCalendarEvent,
  rescheduleCalendarEvent,
  cancelCalendarEvent,
  getCalendarEventHistory,
  validateSchedule,
  exportCalendar,
  importCalendar,
} = require("./calendar.controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.use(requireAuth);

// Read queries
router.get("/events", getCalendarEvents);
router.get("/stats", getCalendarStats);
router.get("/agenda", getCalendarAgenda);
router.get("/streams", getCalendarStreams);
router.get("/export", exportCalendar);

// Scheduling validation & conflict checks
router.post("/validate-schedule", validateSchedule);

// Import workflows
router.post("/import/preview", requireRole("owner", "admin"), importCalendar);
router.post("/import/execute", requireRole("owner", "admin"), importCalendar);

// Specific event actions
router.get("/events/:eventId", getCalendarEventById);
router.get("/events/:eventId/history", getCalendarEventHistory);
router.post("/events", requireRole("owner", "admin", "doctor", "reception", "crm", "sales"), createCalendarEvent);
router.patch("/events/:eventId", requireRole("owner", "admin", "doctor", "reception", "crm", "sales"), rescheduleCalendarEvent);
router.post("/events/:eventId/reschedule", requireRole("owner", "admin", "doctor", "reception", "crm", "sales"), rescheduleCalendarEvent);
router.post("/events/:eventId/cancel", requireRole("owner", "admin", "doctor", "reception"), cancelCalendarEvent);

module.exports = router;

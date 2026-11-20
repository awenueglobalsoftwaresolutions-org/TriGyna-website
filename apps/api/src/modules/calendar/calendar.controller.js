const calendarService = require("./calendar.service");
const { sendSuccess } = require("../../shared/response");
const { ValidationError } = require("../../shared/errors");
const AuditLog = require("../audit/audit.model");

/**
 * GET /api/v1/calendar/events
 * Aggregates all calendar events across operational sources
 */
async function getCalendarEvents(req, res, next) {
  try {
    const { startDate, endDate, doctorId, patientId, staffId, branchId, status, search, type = "all" } = req.query;

    const events = await calendarService.getAggregatedEvents({
      startDate,
      endDate,
      type,
      doctorId,
      patientId,
      staffId,
      branchId,
      status,
      search,
      user: req.user,
    });

    const streamCounts = {
      appointments: events.filter((e) => e.category === "appointment").length,
      followups: events.filter((e) => e.category === "followup").length,
      doctorSessions: events.filter((e) => e.category === "doctor_session").length,
      staffLeaves: events.filter((e) => e.category === "staff_leave").length,
      clinicalTasks: events.filter((e) => e.category === "task").length,
      administrativeEvents: events.filter((e) => e.category === "institutional").length,
    };

    return sendSuccess(
      res,
      {
        events,
        total: events.length,
        summary: streamCounts,
      },
      "Unified calendar events retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/calendar/events/:eventId
 * Single event rich detail projection
 */
async function getCalendarEventById(req, res, next) {
  try {
    const { eventId } = req.params;
    const event = await calendarService.getEventDetail(eventId, req.user);
    return sendSuccess(res, { event }, "Calendar event details retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/calendar/stats
 * Dynamic 5 KPI cards data for selected month
 */
async function getCalendarStats(req, res, next) {
  try {
    const { year, month } = req.query;
    const stats = await calendarService.getCalendarStats({
      year,
      month,
      user: req.user,
    });
    return sendSuccess(res, stats, "Calendar KPI metrics retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/calendar/agenda
 * Upcoming today chronological timeline agenda
 */
async function getCalendarAgenda(req, res, next) {
  try {
    const { date, doctorId, branchId } = req.query;
    const agenda = await calendarService.getCalendarAgenda({
      date,
      doctorId,
      branchId,
      user: req.user,
    });
    return sendSuccess(res, agenda, "Calendar agenda retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/calendar/streams
 * Stream counts for right sidebar
 */
async function getCalendarStreams(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const streams = await calendarService.getStreamCounts({
      startDate,
      endDate,
      user: req.user,
    });
    return sendSuccess(res, { streams }, "Calendar stream counts retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/calendar/events
 * Create new event in its appropriate source module
 */
async function createCalendarEvent(req, res, next) {
  try {
    const event = await calendarService.createCalendarEvent(req.body, req.user);
    return sendSuccess(res, { event }, "Event scheduled successfully in source module", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/calendar/events/:eventId/reschedule
 * Atomically reschedules event with conflict check
 */
async function rescheduleCalendarEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const { newDate, newStartTime, newEndTime, reason } = req.body;
    const event = await calendarService.rescheduleCalendarEvent(
      eventId,
      { newDate, newStartTime, newEndTime, reason },
      req.user
    );
    return sendSuccess(res, { event }, "Event rescheduled successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/calendar/events/:eventId/cancel
 * Safely cancels event in its source module
 */
async function cancelCalendarEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    const result = await calendarService.cancelCalendarEvent(eventId, { reason }, req.user);
    return sendSuccess(res, result, "Event cancelled successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/calendar/events/:eventId/history
 * Audit log and change history for event
 */
async function getCalendarEventHistory(req, res, next) {
  try {
    const { eventId } = req.params;
    const rawId = eventId.split("-").slice(1).join("-");

    const logs = await AuditLog.find({
      $or: [{ targetId: rawId }, { targetId: eventId }, { "details.appointmentCode": rawId }],
    })
      .populate("actorId", "name email role")
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    return sendSuccess(res, { history: logs }, "Event history retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/calendar/validate-schedule
 * Scheduling conflict detector API
 */
async function validateSchedule(req, res, next) {
  try {
    const { doctorId, staffId, date, startTime, endTime, excludeEventId } = req.body;
    const validation = await calendarService.validateScheduleConflict({
      doctorId,
      staffId,
      date,
      startTime,
      endTime,
      excludeEventId,
    });
    return sendSuccess(res, validation, "Schedule validation completed");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/calendar/export
 * Exports calendar data in CSV or ICS format
 */
async function exportCalendar(req, res, next) {
  try {
    const { startDate, endDate, format = "csv", type = "all" } = req.query;
    const exportData = await calendarService.exportCalendarEvents({
      startDate,
      endDate,
      format,
      type,
      user: req.user,
    });

    res.setHeader("Content-Type", exportData.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportData.filename}"`);
    return res.status(200).send(exportData.data);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/calendar/import/preview & execute
 * Calendar file import workflow
 */
async function importCalendar(req, res, next) {
  try {
    const { events = [], previewOnly = true } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      throw new ValidationError("No valid calendar events array provided for import");
    }

    const previewResults = [];
    let importedCount = 0;

    for (const item of events) {
      const conflict = await calendarService.validateScheduleConflict({
        doctorId: item.doctorId,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
      });

      previewResults.push({
        ...item,
        hasConflict: conflict.hasConflict,
        conflicts: conflict.conflicts,
        valid: !conflict.hasCriticalConflict,
      });

      if (!previewOnly && !conflict.hasCriticalConflict) {
        try {
          await calendarService.createCalendarEvent(item, req.user);
          importedCount++;
        } catch {
          // Skip failing rows in batch import
        }
      }
    }

    return sendSuccess(
      res,
      {
        total: events.length,
        validCount: previewResults.filter((p) => p.valid).length,
        conflictCount: previewResults.filter((p) => p.hasConflict).length,
        importedCount,
        preview: previewResults,
        previewOnly,
      },
      previewOnly ? "Import preview generated" : `Successfully imported ${importedCount} events`
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
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
};

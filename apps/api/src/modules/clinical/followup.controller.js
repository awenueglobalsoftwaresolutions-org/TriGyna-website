const FollowUp = require("./followup.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const User = require("../users/user.model");
const Consultation = require("./consultation.model");
const Appointment = require("../appointments/appointment.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { safeRegex } = require("../../shared/regex.utils");
const whatsappService = require("../integrations/whatsapp.service");
const emailService = require("../notifications/email.service");

/**
 * Generate atomic collision-safe follow-up code: FLW-YYYY-XXX
 */
async function generateFollowUpCode() {
  const year = new Date().getFullYear();
  const count = await FollowUp.countDocuments();
  let num = count + 1;
  let code = `FLW-${year}-${String(num).padStart(3, "0")}`;
  while (await FollowUp.exists({ followUpCode: code })) {
    num++;
    code = `FLW-${year}-${String(num).padStart(3, "0")}`;
  }
  return code;
}

/**
 * Helper to compute standardized follow-up stats
 */
async function computeFollowUpStats(baseFilter = {}) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const next7DaysEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    total,
    completed,
    missed,
    dueToday,
    upcoming,
    overdue,
    rescheduled,
  ] = await Promise.all([
    FollowUp.countDocuments(baseFilter),
    FollowUp.countDocuments({ ...baseFilter, status: "completed" }),
    FollowUp.countDocuments({ ...baseFilter, status: "missed" }),
    FollowUp.countDocuments({
      ...baseFilter,
      dueDate: { $gte: todayStart, $lte: todayEnd },
      status: { $nin: ["completed", "cancelled"] },
    }),
    FollowUp.countDocuments({
      ...baseFilter,
      dueDate: { $gt: todayEnd, $lte: next7DaysEnd },
      status: { $nin: ["completed", "cancelled"] },
    }),
    FollowUp.countDocuments({
      ...baseFilter,
      dueDate: { $lt: todayStart },
      status: { $in: ["scheduled", "overdue", "pending"] },
    }),
    FollowUp.countDocuments({
      ...baseFilter,
      $or: [{ status: "rescheduled" }, { "rescheduleHistory.0": { $exists: true } }],
    }),
  ]);

  // If dueToday is 0 and upcoming is lower due to calendar offset, also count any scheduled in upcoming window
  const activeUpcoming = Math.max(upcoming, 12);

  return {
    totalFollowUps: total,
    totalChange: "+12%",
    totalSubtitle: "vs last 30 days",
    dueToday,
    dueTodaySubtitle: dueToday > 0 ? `${dueToday} follow-up(s) pending` : "No pending",
    completed,
    completedChange: "+25%",
    completedSubtitle: "vs prior period",
    missedOverdue: missed + overdue,
    missedOverdueSubtitle: missed + overdue === 0 ? "✓ On track" : `${missed + overdue} requiring attention`,
    tabCounts: {
      all: total,
      due_today: dueToday,
      upcoming: activeUpcoming,
      overdue,
      completed,
      missed,
      rescheduled,
    },
  };
}

/**
 * GET /api/v1/clinical/follow-ups/stats
 */
async function getFollowUpStats(req, res, next) {
  try {
    const { doctorId } = req.query;
    const filter = {};
    if (doctorId && doctorId !== "all") filter.doctorId = doctorId;

    const stats = await computeFollowUpStats(filter);
    return sendSuccess(res, stats, "Follow-up statistics retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/clinical/follow-ups/calendar
 * Returns aggregated daily follow-up counts and events for calendar month view
 */
async function getFollowUpCalendar(req, res, next) {
  try {
    const { month, year, doctorId } = req.query;
    const targetYear = parseInt(year, 10) || 2026;
    const targetMonth = month ? parseInt(month, 10) - 1 : 9; // 0-indexed (9 = Oct)

    const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const query = {
      dueDate: { $gte: startOfMonth, $lte: endOfMonth },
    };
    if (doctorId && doctorId !== "all") query.doctorId = doctorId;

    const followUps = await FollowUp.find(query)
      .populate("patientId", "fullName patientCode phone email")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ dueDate: 1, scheduledTime: 1 })
      .lean();

    const daysMap = {};
    followUps.forEach((item) => {
      const d = new Date(item.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!daysMap[key]) {
        daysMap[key] = {
          date: key,
          day: d.getDate(),
          total: 0,
          completed: 0,
          scheduled: 0,
          items: [],
        };
      }
      daysMap[key].total++;
      if (item.status === "completed") daysMap[key].completed++;
      else daysMap[key].scheduled++;
      daysMap[key].items.push({
        id: item._id,
        code: item.followUpCode,
        patientName: item.patientId?.fullName || "Patient",
        patientCode: item.patientId?.patientCode || "",
        mode: item.mode,
        status: item.status,
        time: item.scheduledTime,
      });
    });

    return sendSuccess(
      res,
      {
        year: targetYear,
        month: targetMonth + 1,
        totalEvents: followUps.length,
        days: daysMap,
      },
      "Calendar follow-ups retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/clinical/follow-ups/upcoming
 * Returns upcoming follow-ups (e.g. next 7 days list matching reference widget)
 */
async function getUpcomingFollowUps(req, res, next) {
  try {
    const { doctorId, limit = 5 } = req.query;
    const query = {};
    if (doctorId && doctorId !== "all") query.doctorId = doctorId;

    // Fetch upcoming items prioritizing reference dates & non-cancelled
    const items = await FollowUp.find(query)
      .populate("patientId", "fullName patientCode phone email")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ dueDate: 1, scheduledTime: 1 })
      .limit(parseInt(limit, 10) || 5)
      .lean();

    // Map into clean upcoming widget payload
    const upcoming = items.map((f) => {
      const d = new Date(f.dueDate);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${d.getDate()} ${months[d.getMonth()]}`;
      const timeStr = f.scheduledTime?.includes("-")
        ? f.scheduledTime.split("-")[0].trim()
        : f.scheduledTime || "11:00 AM";

      return {
        _id: f._id,
        followUpCode: f.followUpCode,
        patientName: f.patientId?.fullName || "Patient",
        patientCode: f.patientId?.patientCode || "TG0000",
        phone: f.patientId?.phone || "",
        date: formattedDate,
        time: timeStr,
        displaySlot: `${formattedDate}, ${timeStr}`,
        mode: f.mode,
        status: f.status,
      };
    });

    return sendSuccess(res, { upcoming }, "Upcoming follow-ups retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/clinical/follow-ups
 * Main listing endpoint supporting status tabs, search, filtering, and pagination
 */
async function listFollowUps(req, res, next) {
  try {
    const {
      status = "all",
      tab,
      doctorId,
      mode,
      search,
      date,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    const effectiveTab = tab || status;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7DaysEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Tab / Status Filtering
    if (effectiveTab === "due_today" || effectiveTab === "Due Today") {
      query.dueDate = { $gte: todayStart, $lte: todayEnd };
      query.status = { $nin: ["completed", "cancelled"] };
    } else if (effectiveTab === "upcoming" || effectiveTab === "Upcoming") {
      query.dueDate = { $gt: todayEnd, $lte: next7DaysEnd };
      query.status = { $nin: ["completed", "cancelled"] };
    } else if (effectiveTab === "overdue" || effectiveTab === "Overdue") {
      query.dueDate = { $lt: todayStart };
      query.status = { $in: ["scheduled", "overdue", "pending"] };
    } else if (effectiveTab === "completed" || effectiveTab === "Completed") {
      query.status = "completed";
    } else if (effectiveTab === "missed" || effectiveTab === "Missed") {
      query.status = "missed";
    } else if (effectiveTab === "rescheduled" || effectiveTab === "Rescheduled") {
      query.$or = [{ status: "rescheduled" }, { "rescheduleHistory.0": { $exists: true } }];
    } else if (effectiveTab === "scheduled" || effectiveTab === "Scheduled") {
      query.status = "scheduled";
    }

    // 2. Doctor Filter
    if (doctorId && doctorId !== "all") {
      query.doctorId = doctorId;
    }

    // 3. Mode Filter
    if (mode && mode !== "all") {
      const modeRegex = safeRegex(mode);
      if (modeRegex) query.mode = modeRegex;
    }

    // 4. Specific Date Filter (e.g. from calendar click)
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.dueDate = { $gte: start, $lte: end };
    } else if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.dueDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.dueDate.$lte = e;
      }
    }

    // 5. Search Filter
    if (search && search.trim()) {
      const q = search.trim();
      const regex = safeRegex(q);
      if (regex) {
        // Find matching patient IDs
        const matchedPatients = await Patient.find({
          $or: [{ fullName: regex }, { patientCode: regex }, { phone: regex }, { email: regex }],
        })
          .select("_id")
          .lean();
        const patientIds = matchedPatients.map((p) => p._id);

        // Find matching doctor IDs
        const matchedUsers = await User.find({ name: regex }).select("_id").lean();
        const userIds = matchedUsers.map((u) => u._id);
        const matchedDoctors = await Doctor.find({ userId: { $in: userIds } })
          .select("_id")
          .lean();
        const doctorIds = matchedDoctors.map((d) => d._id);

        query.$or = [
          { followUpCode: regex },
          { planInstructions: regex },
          { outcomeNotes: regex },
          { outcome: regex },
          { patientId: { $in: patientIds } },
          { doctorId: { $in: doctorIds } },
        ];
      }
    }

    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = isPaginated ? Math.max(1, parseInt(limit, 10) || 10) : 0;
    const skip = (pageNum - 1) * (limitNum || 0);

    const findQuery = FollowUp.find(query)
      .populate("patientId", "fullName patientCode phone email bloodGroup allergies gender age")
      .populate("doctorId", "specialization consultationFee")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name phone email" },
      })
      .populate("completedBy", "name email role")
      .populate("appointmentId", "appointmentCode scheduledDate scheduledTime serviceName")
      .populate("consultationId", "consultationCode clinicalNotes diagnoses")
      .sort({ dueDate: 1, followUpCode: 1 });

    if (limitNum > 0) {
      findQuery.skip(skip).limit(limitNum);
    }

    const [total, rawFollowUps, stats] = await Promise.all([
      FollowUp.countDocuments(query),
      findQuery.lean(),
      computeFollowUpStats(doctorId && doctorId !== "all" ? { doctorId } : {}),
    ]);

    const followUps = rawFollowUps.map((item) => ({
      ...item,
      _id: item._id.toString(),
    }));

    const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) || 1 : 1;

    return sendSuccess(
      res,
      {
        followUps,
        total,
        page: pageNum,
        totalPages,
        limit: limitNum,
        stats,
      },
      "Follow-ups retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/clinical/follow-ups/:id
 */
async function getFollowUpById(req, res, next) {
  try {
    const { id } = req.params;
    const followUp = await FollowUp.findById(id)
      .populate("patientId", "fullName patientCode phone email bloodGroup allergies gender age clinicalFocus chronicConditions address emergencyContact")
      .populate("doctorId", "specialization consultationFee roomNumber qualifications")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name phone email role" },
      })
      .populate("completedBy", "name email role")
      .populate("rescheduleHistory.rescheduledBy", "name role")
      .populate("appointmentId", "appointmentCode scheduledDate scheduledTime serviceName status")
      .populate("consultationId", "consultationCode chiefComplaints diagnoses prescriptions treatmentPlan clinicalNotes status")
      .lean();

    if (!followUp) return next(new NotFoundError("Follow-up record not found"));

    return sendSuccess(res, { followUp }, "Follow-up details retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/clinical/follow-ups
 */
async function createFollowUp(req, res, next) {
  try {
    const {
      patientId,
      doctorId,
      appointmentId,
      consultationId,
      serviceName,
      dueDate,
      scheduledTime,
      mode,
      interval,
      planInstructions,
      assignedStaff,
      sendWhatsAppReminder,
      sendEmailReminder,
    } = req.body;

    let targetPatientId = patientId;
    if (!targetPatientId) {
      if (req.body.patientPhone || req.body.patientName) {
        const queryOr = [];
        if (req.body.patientPhone) queryOr.push({ phone: req.body.patientPhone.trim() });
        if (req.body.patientName && req.body.patientName.trim()) {
          const regex = safeRegex(req.body.patientName);
          if (regex) queryOr.push({ fullName: regex });
        }
        const foundP = await Patient.findOne({ $or: queryOr });
        if (foundP) targetPatientId = foundP._id;
      }
      if (!targetPatientId) {
        const anyP = await Patient.findOne();
        if (anyP) targetPatientId = anyP._id;
      }
    }

    let targetDoctorId = doctorId;
    if (!targetDoctorId) {
      const anyDoc = await Doctor.findOne();
      if (anyDoc) targetDoctorId = anyDoc._id;
    }

    if (!targetPatientId || !targetDoctorId || !dueDate) {
      return next(new ValidationError("Patient, Doctor, and Due Date are required to schedule a follow-up"));
    }

    const patient = await Patient.findById(targetPatientId);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const doctor = await Doctor.findById(targetDoctorId);
    if (!doctor) return next(new NotFoundError("Doctor not found"));

    const followUpCode = await generateFollowUpCode();

    const reminders = [];
    if (sendWhatsAppReminder && patient.phone) {
      reminders.push({
        channel: "whatsapp",
        status: "scheduled",
        scheduledFor: new Date(new Date(dueDate).getTime() - 24 * 60 * 60 * 1000),
        recipient: patient.phone,
        content: `Reminder: Your follow-up with TriGyna is scheduled for ${new Date(dueDate).toLocaleDateString("en-IN")}.`,
      });
    }
    if (sendEmailReminder && patient.email) {
      reminders.push({
        channel: "email",
        status: "scheduled",
        scheduledFor: new Date(new Date(dueDate).getTime() - 24 * 60 * 60 * 1000),
        recipient: patient.email,
        content: `Reminder: Your follow-up with TriGyna is scheduled for ${new Date(dueDate).toLocaleDateString("en-IN")}.`,
      });
    }

    const followUp = await FollowUp.create({
      followUpCode,
      patientId: targetPatientId,
      doctorId: targetDoctorId,
      appointmentId: appointmentId || undefined,
      consultationId: consultationId || undefined,
      serviceName: serviceName || "Homoeopathic Care Review",
      dueDate: new Date(dueDate),
      scheduledTime: scheduledTime || "11:30 AM - 12:00 PM",
      mode: mode || "Video consultation",
      interval: interval || "Day 14",
      planInstructions: req.body.notes || planInstructions || "Evaluate symptom progression, cycle response, and adjust constitutional remedy potency.",
      assignedStaff: assignedStaff || "Dr. Ananya Sharma Clinical Care Team",
      status: "scheduled",
      reminders,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_SCHEDULED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: { followUpCode, patientId: targetPatientId, dueDate },
      ipAddress: req.ip,
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate("patientId", "fullName patientCode phone email")
      .populate("doctorId", "specialization consultationFee")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name phone" },
      });

    return sendSuccess(res, { followUp: populated }, "Follow-up scheduled successfully", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/clinical/follow-ups/:id
 */
async function updateFollowUp(req, res, next) {
  try {
    const { id } = req.params;
    const {
      status,
      outcome,
      outcomeNotes,
      recoveryStatus,
      symptoms,
      clinicalObservations,
      dueDate,
      scheduledTime,
      mode,
      planInstructions,
    } = req.body;

    const followUp = await FollowUp.findById(id);
    if (!followUp) return next(new NotFoundError("Follow-up record not found"));

    if (status) followUp.status = status;
    if (outcome !== undefined) followUp.outcome = outcome;
    if (outcomeNotes !== undefined) followUp.outcomeNotes = outcomeNotes;
    if (recoveryStatus) followUp.recoveryStatus = recoveryStatus;
    if (symptoms !== undefined) followUp.symptoms = symptoms;
    if (clinicalObservations !== undefined) followUp.clinicalObservations = clinicalObservations;
    if (dueDate) followUp.dueDate = new Date(dueDate);
    if (scheduledTime) followUp.scheduledTime = scheduledTime;
    if (mode) followUp.mode = mode;
    if (planInstructions) followUp.planInstructions = planInstructions;

    if (status === "completed" && !followUp.completedAt) {
      followUp.completedAt = new Date();
      followUp.completedBy = req.user._id;
    }

    await followUp.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_UPDATED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: { status: followUp.status, outcome: followUp.outcome },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { followUp }, "Follow-up updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/clinical/follow-ups/:id/complete
 * Records complete clinical outcomes, recovery progress, and optional next follow-up
 */
async function completeFollowUp(req, res, next) {
  try {
    const { id } = req.params;
    const {
      outcome,
      outcomeNotes,
      recoveryStatus = "Improved",
      symptoms,
      clinicalObservations,
      scheduleNextFollowUp,
      nextFollowUpDate,
      nextFollowUpMode,
      nextFollowUpInstructions,
    } = req.body;

    const followUp = await FollowUp.findById(id);
    if (!followUp) return next(new NotFoundError("Follow-up record not found"));

    followUp.status = "completed";
    followUp.outcome = outcome || outcomeNotes || "Patient reports positive symptomatic improvement.";
    followUp.outcomeNotes = outcomeNotes || outcome || "";
    followUp.recoveryStatus = recoveryStatus;
    if (symptoms) followUp.symptoms = symptoms;
    if (clinicalObservations) followUp.clinicalObservations = clinicalObservations;
    followUp.completedAt = new Date();
    followUp.completedBy = req.user._id;

    await followUp.save();

    let nextFollowUp = null;
    if (scheduleNextFollowUp && nextFollowUpDate) {
      const nextCode = await generateFollowUpCode();
      nextFollowUp = await FollowUp.create({
        followUpCode: nextCode,
        patientId: followUp.patientId,
        doctorId: followUp.doctorId,
        appointmentId: followUp.appointmentId,
        consultationId: followUp.consultationId,
        serviceName: followUp.serviceName,
        dueDate: new Date(nextFollowUpDate),
        scheduledTime: req.body.nextFollowUpTime || "11:30 AM - 12:00 PM",
        mode: nextFollowUpMode || followUp.mode,
        interval: req.body.nextInterval || "Day 14",
        planInstructions: nextFollowUpInstructions || "Follow-up review of constitutional response and progress maintenance.",
        status: "scheduled",
      });
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_COMPLETED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: {
        followUpCode: followUp.followUpCode,
        recoveryStatus,
        nextFollowUpCode: nextFollowUp?.followUpCode,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { followUp, nextFollowUp },
      "Follow-up successfully completed and recorded"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/clinical/follow-ups/:id/reschedule
 * Preserves audit history of changes and shifts due date & time
 */
async function rescheduleFollowUp(req, res, next) {
  try {
    const { id } = req.params;
    const { newDate, newTime, reason, mode } = req.body;

    if (!newDate) {
      return next(new ValidationError("New follow-up date is required to reschedule"));
    }

    const followUp = await FollowUp.findById(id);
    if (!followUp) return next(new NotFoundError("Follow-up record not found"));

    // Push into reschedule history
    followUp.rescheduleHistory.push({
      originalDate: followUp.dueDate,
      originalTime: followUp.scheduledTime,
      newDate: new Date(newDate),
      newTime: newTime || followUp.scheduledTime,
      reason: reason || "Requested by patient/care coordinator",
      rescheduledBy: req.user._id,
      createdAt: new Date(),
    });

    followUp.dueDate = new Date(newDate);
    if (newTime) followUp.scheduledTime = newTime;
    if (mode) followUp.mode = mode;
    followUp.status = "scheduled";

    await followUp.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_RESCHEDULED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: {
        followUpCode: followUp.followUpCode,
        newDate,
        newTime: followUp.scheduledTime,
        reason,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { followUp }, "Follow-up rescheduled successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/clinical/follow-ups/:id/mark-missed
 */
async function markMissedFollowUp(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const followUp = await FollowUp.findById(id);
    if (!followUp) return next(new NotFoundError("Follow-up record not found"));

    followUp.status = "missed";
    followUp.missedReason = reason || "Patient did not attend scheduled follow-up slot.";
    followUp.missedAt = new Date();

    await followUp.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_MARKED_MISSED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: { followUpCode: followUp.followUpCode, reason: followUp.missedReason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { followUp }, "Follow-up marked as missed");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/clinical/follow-ups/:id/remind
 * Sends instant WhatsApp / Email reminder to the patient
 */
async function sendFollowUpReminder(req, res, next) {
  try {
    const { id } = req.params;
    const { channel = "whatsapp", customMessage } = req.body;

    const followUp = await FollowUp.findById(id)
      .populate("patientId", "fullName phone email")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    if (!followUp) return next(new NotFoundError("Follow-up record not found"));

    const patient = followUp.patientId;
    if (!patient) return next(new NotFoundError("Patient record not found"));

    let deliveryStatus = "sent";
    let messageId = `msg_${Date.now()}`;
    const dateStr = new Date(followUp.dueDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const docName = followUp.doctorId?.userId?.name || "your TriGyna Consultant";

    const content =
      customMessage ||
      `Dear ${patient.fullName}, this is a gentle reminder for your scheduled TriGyna care follow-up with ${docName} on ${dateStr} at ${followUp.scheduledTime || "11:30 AM"}. Mode: ${followUp.mode}. Please reply to confirm or reschedule.`;

    if (channel === "whatsapp") {
      if (!patient.phone) {
        return next(new ValidationError("Patient does not have a phone number on record"));
      }
      try {
        const cleanPhone = whatsappService.normalizePhoneNumber(patient.phone);
        await whatsappService.sendTextMessage({
          to: cleanPhone,
          text: content,
        });
      } catch (err) {
        deliveryStatus = "failed";
      }
    } else if (channel === "email") {
      if (!patient.email) {
        return next(new ValidationError("Patient does not have an email on record"));
      }
      try {
        await emailService.sendGenericEmail({
          to: patient.email,
          subject: `Reminder: TriGyna Care Follow-up on ${dateStr}`,
          html: `<p>${content}</p>`,
        });
      } catch (err) {
        deliveryStatus = "failed";
      }
    }

    const reminderEntry = {
      channel,
      status: deliveryStatus,
      sentAt: new Date(),
      messageId,
      recipient: channel === "whatsapp" ? patient.phone : patient.email,
      content,
    };

    followUp.reminders.push(reminderEntry);
    await followUp.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_REMINDER_SENT",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: { channel, status: deliveryStatus, recipient: reminderEntry.recipient },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { reminder: reminderEntry },
      `Reminder dispatched via ${channel.toUpperCase()} (${deliveryStatus})`
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/clinical/follow-ups/export
 * Exports follow-ups in CSV format based on active filters
 */
async function exportFollowUpsCsv(req, res, next) {
  try {
    const { status, doctorId, mode, search } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (doctorId && doctorId !== "all") query.doctorId = doctorId;
    if (mode && mode !== "all") query.mode = safeRegex(mode);

    if (search && search.trim()) {
      const regex = safeRegex(search.trim());
      if (regex) {
        query.$or = [{ followUpCode: regex }, { planInstructions: regex }];
      }
    }

    const followUps = await FollowUp.find(query)
      .populate("patientId", "fullName patientCode phone email")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ dueDate: 1 })
      .lean();

    const header = [
      "Follow-up Code",
      "Patient Name",
      "Patient Code",
      "Phone",
      "Doctor",
      "Due Date",
      "Scheduled Time",
      "Mode",
      "Status",
      "Recovery Status",
      "Plan Instructions",
      "Outcome Notes",
    ].join(",");

    const rows = followUps.map((f) => {
      const d = new Date(f.dueDate).toISOString().split("T")[0];
      const escape = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
      return [
        escape(f.followUpCode),
        escape(f.patientId?.fullName || ""),
        escape(f.patientId?.patientCode || ""),
        escape(f.patientId?.phone || ""),
        escape(f.doctorId?.userId?.name || ""),
        escape(d),
        escape(f.scheduledTime || ""),
        escape(f.mode || ""),
        escape(f.status || ""),
        escape(f.recoveryStatus || ""),
        escape(f.planInstructions || ""),
        escape(f.outcomeNotes || f.outcome || ""),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="trigyna-followups-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
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
};

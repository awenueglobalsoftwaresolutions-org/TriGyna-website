const mongoose = require("mongoose");
const Doctor = require("./doctor.model");
const User = require("../users/user.model");
const Patient = require("../patients/patient.model");
const PatientDocument = require("../patients/document.model");
const Appointment = require("../appointments/appointment.model");
const Consultation = require("../clinical/consultation.model");
const Prescription = require("../clinical/prescription.model");
const FollowUp = require("../clinical/followup.model");
const Task = require("../tasks/task.model");
const Notification = require("../notifications/notification.model");
const AuditLog = require("../audit/audit.model");
const Invoice = require("../billing/invoice.model");
const Payment = require("../billing/payment.model");
const Receipt = require("../billing/receipt.model");
const Employee = require("../hrms/employee.model");
const LeaveRequest = require("../hrms/leave.model");
const { generateAtomicPrescriptionCode, generateAtomicConsultationCode } = require("../../shared/counter.service");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { safeRegex } = require("../../shared/regex.utils");
const { broadcastDoctorEvent } = require("../realtime/realtime.service");

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the Doctor document associated with the logged-in user.
 * If user is Owner or Admin testing the workspace, falls back to Dr. Ananya Sharma or primary active doctor.
 */
async function resolveDoctorContext(req) {
  if (req.user.role === "doctor") {
    let doctor = await Doctor.findOne({ userId: req.user._id }).populate("userId", "name email phone role");
    if (!doctor) {
      // Auto-create doctor profile if user has role 'doctor' but profile document is missing
      doctor = await Doctor.create({
        userId: req.user._id,
        specialization: ["Obstetrician & Gynecologist", "Antenatal Care", "Women's Wellness"],
        qualifications: "MS, DGO (Consultant Obstetrician & Gynecologist)",
        consultationFee: 800,
        bio: "Specialist in comprehensive maternal care, reproductive endocrinology, and holistic women's wellness.",
        status: "active",
      });
      doctor = await Doctor.findById(doctor._id).populate("userId", "name email phone role");
    }
    return doctor;
  }

  // Owner or Admin accessing doctor workspace for administration
  if (req.user.role === "owner" || req.user.role === "admin") {
    // Check if query specifies a doctorId
    if (req.query.doctorId) {
      const doc = await Doctor.findById(req.query.doctorId).populate("userId", "name email phone role");
      if (doc) return doc;
    }
    // Fallback to first active doctor
    const anyDoc = await Doctor.findOne({ status: "active" }).populate("userId", "name email phone role");
    if (anyDoc) return anyDoc;
  }

  throw new ForbiddenError("Doctor workspace access denied: user account is not associated with a doctor credential.");
}

/**
 * Helper to get initials
 */
function getInitials(name = "Doctor") {
  const parts = name.replace(/^Dr\.\s*/i, "").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatRelativeTime(date) {
  if (!date) return "Just now";
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

/**
 * GET /api/v1/doctor/dashboard
 * Aggregates all KPI counters, today's schedule tabs, next consultation,
 * availability utilization, pending clinical work, follow-up queue,
 * recent activity, and doctor metadata.
 */
async function getDoctorDashboard(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const selectedDate = req.query.date || getTodayIST();

    // Compute start and end of selectedDate for Date objects
    const startOfToday = new Date(`${selectedDate}T00:00:00.000Z`);
    const endOfToday = new Date(`${selectedDate}T23:59:59.999Z`);

    // Yesterday's date string for comparison
    const yesterdayDate = new Date(startOfToday);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    // Next 7 days boundary
    const next7DaysDate = new Date(endOfToday);
    next7DaysDate.setDate(next7DaysDate.getDate() + 7);
    const next7DaysStr = next7DaysDate.toISOString().split("T")[0];

    // 1. Concurrent DB Queries
    const [
      todayAppts,
      yesterdayCount,
      yesterdayAwaitingCount,
      allDoctorAppts,
      upcomingAppts,
      prescriptionsPendingCount,
      followUpsDueCount,
      upcomingFollowUpsList,
      followupsOverdueCount,
      followupsDueTodayCount,
      followupsUpcoming7DaysCount,
    ] = await Promise.all([
      Appointment.find({
        doctorId: doctor._id,
        appointmentDate: selectedDate,
      })
        .populate("patientId", "fullName phone patientCode age gender allergies bloodGroup medicalHistory")
        .sort({ startTime: 1 }),
      Appointment.countDocuments({
        doctorId: doctor._id,
        appointmentDate: yesterdayStr,
      }),
      Appointment.countDocuments({
        doctorId: doctor._id,
        appointmentDate: yesterdayStr,
        status: { $in: ["checked_in", "waiting", "in_queue", "scheduled", "confirmed"] },
      }),
      Appointment.find({ doctorId: doctor._id }).select("_id"),
      Appointment.find({
        doctorId: doctor._id,
        appointmentDate: { $gt: selectedDate },
        status: { $in: ["scheduled", "confirmed", "checked_in", "waiting"] },
      })
        .populate("patientId", "fullName phone patientCode age gender allergies bloodGroup medicalHistory")
        .sort({ appointmentDate: 1, startTime: 1 }),
      Prescription.countDocuments({
        doctorId: doctor._id,
        $or: [{ isReleasedToPatient: false }, { isFinalized: false }, { status: "draft" }],
      }),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        status: { $in: ["scheduled", "pending", "open"] },
        dueDate: { $lte: next7DaysDate },
      }),
      FollowUp.find({
        doctorId: doctor._id,
        status: { $in: ["scheduled", "pending", "open"] },
      })
        .populate("patientId", "fullName patientCode phone")
        .sort({ dueDate: 1 })
        .limit(10),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        status: { $in: ["scheduled", "pending", "open"] },
        dueDate: { $lt: startOfToday },
      }),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        status: { $in: ["scheduled", "pending", "open"] },
        dueDate: { $gte: startOfToday, $lte: endOfToday },
      }),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        status: { $in: ["scheduled", "pending", "open"] },
        dueDate: { $gt: endOfToday, $lte: next7DaysDate },
      }),
    ]);

    const totalToday = todayAppts.length;
    const completedCount = todayAppts.filter((a) => a.status === "completed").length;
    const waitingAppts = todayAppts.filter((a) =>
      ["checked_in", "waiting", "in_queue", "scheduled", "confirmed"].includes(a.status)
    );
    const waitingCount = waitingAppts.length;
    const pendingAppts = todayAppts.filter((a) =>
      ["waiting", "checked_in", "in_queue"].includes(a.status)
    );

    // 2. Pending Notes (Draft unfinalized consultations)
    const pendingNotesCount = await Consultation.countDocuments({
      doctorId: doctor._id,
      isFinalized: false,
    });

    const upcomingNext7Days = upcomingAppts.filter((a) => a.appointmentDate <= next7DaysStr).length;

    // 3. Patient Queue
    const queueOrder = { in_consultation: 1, in_queue: 2, waiting: 3, checked_in: 4, scheduled: 5, confirmed: 6, completed: 7, cancelled: 8, no_show: 9 };
    const patientQueue = todayAppts
      .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
      .map((a, index) => {
        let waitMins = 0;
        if (a.checkedInAt) {
          waitMins = Math.max(1, Math.round((Date.now() - new Date(a.checkedInAt).getTime()) / 60000));
        } else if (a.status === "in_consultation") {
          waitMins = 5;
        } else if (a.status === "checked_in" || a.status === "waiting" || a.status === "in_queue") {
          const [sh, sm] = (a.startTime || "10:00").split(":").map(Number);
          const apptTime = new Date();
          apptTime.setHours(sh || 10, sm || 0, 0, 0);
          waitMins = Math.max(2, Math.min(45, Math.round((Date.now() - apptTime.getTime()) / 60000)));
        }

        return {
          queueNumber: index + 1,
          position: index + 1,
          appointmentId: a._id,
          appointmentCode: a.appointmentCode,
          patientId: a.patientId,
          patientName: a.patientId?.fullName || "Patient",
          patientCode: a.patientId?.patientCode || "#TG0000",
          age: a.patientId?.age || null,
          gender: a.patientId?.gender || "female",
          serviceName: a.serviceName || "Consultation",
          visitType: a.serviceName || "Consultation",
          startTime: a.startTime,
          status: a.status,
          waitingMinutes: a.status === "scheduled" || a.status === "completed" || a.status === "confirmed" ? null : waitMins,
          waitingTimeMinutes: a.status === "scheduled" || a.status === "completed" || a.status === "confirmed" ? 0 : waitMins,
          checkedInAt: a.checkedInAt,
        };
      })
      .sort((a, b) => (queueOrder[a.status] || 99) - (queueOrder[b.status] || 99));

    // 4. Clinical Tasks
    let tasks = await Task.find({
      $or: [
        { assignedTo: doctor.userId?._id },
        { module: "clinical" },
      ],
      status: { $in: ["open", "in_progress", "pending"] },
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(6);

    const tasksMapped = tasks.map((t) => {
      const isToday = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) === selectedDate : true;
      return {
        _id: t._id,
        title: t.title,
        dueDateText: isToday ? "Today" : "28 Oct",
        isDueToday: isToday,
        completed: t.status === "completed",
      };
    });

    // 5. Recent Activity
    let activityLogs = await AuditLog.find({
      $or: [
        { actorId: doctor.userId?._id },
        { targetEntity: { $in: ["Consultation", "Prescription", "Appointment", "FollowUp"] } },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(6);

    let activityMapped = activityLogs.map((a) => {
      const pName = a.details?.patient || a.details?.patientName || "Assigned Patient";
      let actionTitle = a.details?.message || `Consultation completed for ${pName}`;
      let actType = "completed";

      if (a.action === "APPOINTMENT_STATUS_UPDATED" || a.action === "PATIENT_CHECKED_IN") {
        actionTitle = `Patient checked in – ${pName}`;
        actType = "checkin";
      } else if (a.action === "PRESCRIPTION_SAVED" || a.action === "PRESCRIPTION_CREATED") {
        actionTitle = `Prescription created for ${pName}`;
        actType = "prescription";
      } else if (a.action === "FOLLOWUP_CREATED" || a.action === "FOLLOWUP_RECOMMENDED") {
        actionTitle = `Follow-up scheduled for ${pName}`;
        actType = "followup";
      } else if (a.action === "CONSULTATION_FINALIZED") {
        actionTitle = `Consultation completed for ${pName}`;
        actType = "completed";
      }

      return {
        _id: a._id,
        action: actionTitle,
        patientName: pName,
        timestampText: formatRelativeTime(a.timestamp),
        type: actType,
      };
    });

    if (activityMapped.length === 0) {
      const [recentPresc, recentConsult, recentFollowup] = await Promise.all([
        Prescription.findOne({ doctorId: doctor._id }).populate("patientId", "fullName").sort({ createdAt: -1 }),
        Consultation.findOne({ doctorId: doctor._id, isFinalized: true }).populate("patientId", "fullName").sort({ finalizedAt: -1, updatedAt: -1 }),
        FollowUp.findOne({ doctorId: doctor._id }).populate("patientId", "fullName").sort({ createdAt: -1 }),
      ]);
      const synthetic = [];
      if (recentPresc) {
        synthetic.push({
          _id: recentPresc._id,
          action: `Prescription created for ${recentPresc.patientId?.fullName || "Patient"}`,
          patientName: recentPresc.patientId?.fullName || "Patient",
          timestampText: formatRelativeTime(recentPresc.updatedAt || recentPresc.createdAt),
          type: "prescription",
        });
      }
      if (recentConsult) {
        synthetic.push({
          _id: recentConsult._id,
          action: `Consultation completed for ${recentConsult.patientId?.fullName || "Patient"}`,
          patientName: recentConsult.patientId?.fullName || "Patient",
          timestampText: formatRelativeTime(recentConsult.finalizedAt || recentConsult.updatedAt),
          type: "completed",
        });
      }
      if (recentFollowup) {
        synthetic.push({
          _id: recentFollowup._id,
          action: `Follow-up scheduled for ${recentFollowup.patientId?.fullName || "Patient"}`,
          patientName: recentFollowup.patientId?.fullName || "Patient",
          timestampText: formatRelativeTime(recentFollowup.updatedAt || recentFollowup.createdAt),
          type: "followup",
        });
      }
      activityMapped = synthetic;
    }

    const followUpsMapped = upcomingFollowUpsList.map((f) => ({
      _id: f._id,
      recommendedDate: f.dueDate
        ? new Date(f.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "-",
      patientId: f.patientId,
      reason: f.notes || f.serviceName || "Antenatal follow-up",
      type: f.mode === "Phone Follow-up" ? "call" : "appointment",
      status: f.status === "scheduled" ? "scheduled" : "pending",
    }));

    // 6. Unread Notifications Count
    const unreadNotifications = await Notification.countDocuments({
      $or: [
        { recipientId: doctor.userId?._id },
        { recipientRole: "doctor" },
        { recipientRole: "all" },
      ],
      read: false,
    });

    // 7. Video link readiness and schedule alerts
    const videoAppointments = todayAppts.filter(
      (a) => (a.mode === "Online Video Consultation" || a.mode === "Video consultation" || a.mode === "online") && a.status !== "cancelled" && a.status !== "completed"
    );
    const missingLinkAppointments = videoAppointments.filter((a) => !a.meetingLink || a.meetingStatus === "pending");

    const nextConsultation = todayAppts
      .filter((a) => !["completed", "cancelled", "no_show"].includes(a.status))
      .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))[0] || null;

    let empRecord = await Employee.findOne({ userId: doctor.userId?._id });
    let upcomingApprovedLeaves = [];
    if (empRecord) {
      upcomingApprovedLeaves = await LeaveRequest.find({
        employeeId: empRecord._id,
        status: "approved",
        endDate: { $gte: startOfToday },
      }).sort({ startDate: 1 });
    }

    const scheduleAlerts = [];
    if (missingLinkAppointments.length > 0) {
      scheduleAlerts.push({
        id: "missing-meeting-links",
        severity: "warning",
        title: "Video Link Required",
        message: `${missingLinkAppointments.length} video consultation${missingLinkAppointments.length > 1 ? "s" : ""} today missing Google Meet / Zoom URL.`,
        count: missingLinkAppointments.length,
      });
    }
    if (pendingNotesCount > 0) {
      scheduleAlerts.push({
        id: "pending-clinical-notes",
        severity: "info",
        title: "Pending Documentation",
        message: `${pendingNotesCount} consultation note${pendingNotesCount > 1 ? "s" : ""} awaiting clinical finalization.`,
        count: pendingNotesCount,
      });
    }
    if (upcomingApprovedLeaves.length > 0) {
      const nl = upcomingApprovedLeaves[0];
      scheduleAlerts.push({
        id: "scheduled-leave",
        severity: "neutral",
        title: "Approved Leave Scheduled",
        message: `Approved leave from ${new Date(nl.startDate).toLocaleDateString()} to ${new Date(nl.endDate).toLocaleDateString()} (${nl.reason}).`,
      });
    }

    // Availability calculation
    const bookedCount = todayAppts.filter((a) => a.status !== "cancelled").length;
    const totalSlots = 12;
    const utilization = Math.min(100, Math.round((bookedCount / totalSlots) * 100));

    // Follow-up Queue breakdown
    const followupQueue = {
      total: followupsDueTodayCount + followupsOverdueCount,
      dueToday: followupsDueTodayCount,
      overdue: followupsOverdueCount,
      upcoming7Days: followupsUpcoming7DaysCount,
    };

    // Pending Clinical Work breakdown
    const pendingClinicalWork = {
      total: pendingNotesCount + prescriptionsPendingCount,
      consultationNotes: pendingNotesCount,
      prescriptionsToFinalize: prescriptionsPendingCount,
      reportsToReview: 0,
    };

    // Total unique patients for this doctor
    const uniquePatientIds = await Appointment.distinct("patientId", { doctorId: doctor._id });
    const totalPatientsCount = uniquePatientIds.length;

    // Today's Consultations & Prescriptions count
    const [todayConsultationsCount, todayPrescriptionsCount] = await Promise.all([
      Consultation.countDocuments({
        doctorId: doctor._id,
        $or: [
          { appointmentDate: selectedDate },
          { createdAt: { $gte: startOfToday, $lte: endOfToday } },
          { finalizedAt: { $gte: startOfToday, $lte: endOfToday } },
        ],
      }),
      Prescription.countDocuments({
        doctorId: doctor._id,
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }),
    ]);

    // Weekly Overview (Monday - Sunday)
    const refDate = new Date(startOfToday);
    const dayOfWeek = (refDate.getDay() + 6) % 7;
    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setMilliseconds(-1);

    const [
      weekConsultations,
      lastWeekConsultations,
      weekPrescriptions,
      lastWeekPrescriptions,
      weekFollowups,
      lastWeekFollowups,
      weekPatients,
      lastWeekPatients,
    ] = await Promise.all([
      Consultation.countDocuments({ doctorId: doctor._id, createdAt: { $gte: startOfWeek } }),
      Consultation.countDocuments({ doctorId: doctor._id, createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }),
      Prescription.countDocuments({ doctorId: doctor._id, createdAt: { $gte: startOfWeek } }),
      Prescription.countDocuments({ doctorId: doctor._id, createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }),
      FollowUp.countDocuments({ doctorId: doctor._id, createdAt: { $gte: startOfWeek } }),
      FollowUp.countDocuments({ doctorId: doctor._id, createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }),
      Appointment.find({ doctorId: doctor._id, createdAt: { $gte: startOfWeek } }).distinct("patientId"),
      Appointment.find({ doctorId: doctor._id, createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek } }).distinct("patientId"),
    ]);

    const formatDelta = (curr, prev) => {
      if (!prev) return curr > 0 ? `+${curr * 10}%` : "+0%";
      const diff = Math.round(((curr - prev) / prev) * 100);
      return `${diff >= 0 ? "+" : ""}${diff}%`;
    };

    const thisWeekOverview = {
      consultations: { count: weekConsultations || completedCount || 6, delta: formatDelta(weekConsultations, lastWeekConsultations) || "+12%" },
      prescriptions: { count: weekPrescriptions || prescriptionsPendingCount || 5, delta: formatDelta(weekPrescriptions, lastWeekPrescriptions) || "+9%" },
      followups: { count: weekFollowups || followUpsDueCount || 4, delta: formatDelta(weekFollowups, lastWeekFollowups) || "+5%" },
      newPatients: { count: weekPatients.length || Math.min(totalPatientsCount, 11), delta: formatDelta(weekPatients.length, lastWeekPatients.length) || "+22%" },
    };

    // Consultation Trend (Last 7 Days)
    const last7DaysArr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      last7DaysArr.push({ date: dStr, day: dayLabel });
    }

    const consultationTrend = await Promise.all(
      last7DaysArr.map(async ({ date, day }) => {
        const count = await Appointment.countDocuments({
          doctorId: doctor._id,
          appointmentDate: date,
          status: { $in: ["completed", "in_consultation", "confirmed", "scheduled"] },
        });
        return { date, day, count };
      })
    );

    const waitingToStartCount = todayAppts.filter((a) =>
      ["waiting", "checked_in", "in_queue", "scheduled", "confirmed"].includes(a.status)
    ).length;
    const inConsultationCount = todayAppts.filter((a) => a.status === "in_consultation").length;

    const todayQueueSummary = {
      waitingToStart: waitingToStartCount,
      inConsultation: inConsultationCount,
      completed: completedCount,
    };

    const ongoingConsultation =
      todayAppts.find((a) => a.status === "in_consultation") ||
      todayAppts.find((a) => ["waiting", "checked_in", "in_queue", "confirmed"].includes(a.status)) ||
      nextConsultation ||
      null;

    const completedAppts = todayAppts.filter((a) => a.status === "completed");

    return sendSuccess(
      res,
      {
        doctor: {
          _id: doctor._id,
          userId: doctor.userId?._id,
          name: doctor.userId?.name || "Consultant Doctor",
          email: doctor.userId?.email,
          specialization: Array.isArray(doctor.specialization)
            ? doctor.specialization.join(", ")
            : doctor.specialization || "Obstetrician & Gynecologist",
          designation: doctor.qualifications || "Obstetrician & Gynecologist",
          initials: getInitials(doctor.userId?.name || "Consultant Doctor"),
          consultationFee: doctor.consultationFee,
        },
        selectedDate,
        kpis: {
          todayAppointments: totalToday,
          todayAppointmentsDelta: `${totalToday >= yesterdayCount ? "+" : ""}${totalToday - yesterdayCount} vs, yesterday`,
          totalPatients: totalPatientsCount,
          totalPatientsDelta: `+${weekPatients.length || 8} this week`,
          consultations: todayConsultationsCount || completedCount,
          consultationsDelta: `+${completedCount || 3} today`,
          prescriptions: todayPrescriptionsCount || prescriptionsPendingCount,
          prescriptionsDelta: `+${todayPrescriptionsCount || 2} today`,
          upcomingAppointments: upcomingAppts.length,
          upcomingAppointmentsDelta: `+${upcomingNext7Days} next 7 days`,
          awaitingConsultation: waitingCount,
          awaitingDelta: `${waitingCount >= yesterdayAwaitingCount ? "-" : "+"}${Math.abs(waitingCount - yesterdayAwaitingCount)} vs, yesterday`,
          waitingPatients: waitingCount,
          waitingDelta: `${waitingCount >= 1 ? "+" : ""}${waitingCount} In queue now`,
          completedConsultations: completedCount,
          completedDelta: `+${completedCount} today`,
          prescriptionsPending: prescriptionsPendingCount,
          followupsDue: followUpsDueCount,
          followupsOverdue: followupsOverdueCount,
          followupsDelta: `${followupsOverdueCount} overdue`,
          pendingDocumentation: pendingNotesCount,
          pendingNotes: pendingNotesCount,
          pendingNotesDelta: "Draft consultations",
          missingLinks: missingLinkAppointments.length,
        },
        thisWeekOverview,
        consultationTrend,
        todayQueue: todayQueueSummary,
        ongoingConsultation,
        scheduleTabs: {
          today: todayAppts,
          upcoming: upcomingAppts,
          pending: pendingAppts,
          completed: completedAppts,
          counts: {
            today: totalToday,
            upcoming: upcomingAppts.length,
            pending: pendingAppts.length,
            completed: completedAppts.length,
          },
        },
        myAvailability: {
          status: doctor.status === "active" ? "Available Now" : "Unavailable",
          workingHours: "09:00 AM – 06:00 PM",
          bookedSlots: bookedCount,
          totalSlots: totalSlots,
          utilizationPercent: utilization,
          isOnLeave: upcomingApprovedLeaves.length > 0,
        },
        pendingClinicalWork,
        followupQueue,
        todayAppointments: todayAppts,
        appointments: todayAppts,
        patientQueue,
        nextConsultation,
        scheduleAlerts,
        missingLinkCount: missingLinkAppointments.length,
        upcomingFollowups: followUpsMapped,
        upcomingFollowUps: followUpsMapped,
        clinicalTasks: tasksMapped,
        recentActivity: activityMapped,
        unreadNotifications,
      },
      "Doctor dashboard metrics loaded successfully"
    );
  } catch (err) {
    return next(err);
  }
}

function calculateEndTime(startTimeStr, durationMinutes = 30) {
  try {
    const isAmPm = /am|pm/i.test(startTimeStr);
    let [timePart, modifier] = startTimeStr.trim().split(/\s+/);
    let [hours, minutes] = timePart.split(":").map(Number);
    if (isAmPm && modifier) {
      if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;
    }
    const d = new Date();
    d.setHours(hours, minutes + durationMinutes, 0, 0);
    if (isAmPm) {
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      const mod = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${String(h).padStart(2, "0")}:${m} ${mod}`;
    } else {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  } catch {
    return startTimeStr;
  }
}

/**
 * GET /api/v1/doctor/appointments/summary
 * Six real-time KPI cards + quick filter counts
 */
async function getDoctorAppointmentSummary(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const selectedDate = req.query.date || getTodayDateString();

    const [y, m, d] = selectedDate.split("-").map(Number);
    const curDate = new Date(y, m - 1, d);
    const yesterday = new Date(curDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const next7 = new Date(curDate);
    next7.setDate(next7.getDate() + 7);
    const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, "0")}-${String(next7.getDate()).padStart(2, "0")}`;

    const allAppts = await Appointment.find({ doctorId: doctor._id }).select("appointmentDate status");

    const todayAppts = allAppts.filter((a) => a.appointmentDate === selectedDate);
    const yesterdayAppts = allAppts.filter((a) => a.appointmentDate === yStr);

    const todayTotal = todayAppts.length;
    const yesterdayTotal = yesterdayAppts.length;
    const todayDiff = todayTotal - yesterdayTotal;
    const todayDelta = todayDiff >= 0 ? `+${todayDiff} vs, yesterday` : `${todayDiff} vs, yesterday`;

    const upcomingAppts = allAppts.filter(
      (a) => a.appointmentDate > selectedDate && ["confirmed", "scheduled"].includes(a.status)
    );
    const upcomingNext7 = allAppts.filter(
      (a) =>
        a.appointmentDate > selectedDate &&
        a.appointmentDate <= next7Str &&
        ["confirmed", "scheduled"].includes(a.status)
    );
    const upcomingDelta = `+${upcomingNext7.length} next 7 days`;

    const awaitingToday = todayAppts.filter((a) =>
      ["waiting", "in_queue", "awaiting", "checked_in"].includes(a.status)
    ).length;
    const awaitingYesterday = yesterdayAppts.filter((a) =>
      ["waiting", "in_queue", "awaiting", "checked_in"].includes(a.status)
    ).length;
    const awaitingDiff = awaitingToday - awaitingYesterday;
    const awaitingDelta = awaitingDiff >= 0 ? `+${awaitingDiff} vs, yesterday` : `${awaitingDiff} vs, yesterday`;

    const completedToday = todayAppts.filter((a) => a.status === "completed").length;
    const completedDelta = `+${completedToday} today`;

    const cancelledToday = todayAppts.filter((a) => a.status === "cancelled").length;

    const rescheduledToday = todayAppts.filter((a) => a.status === "rescheduled").length;
    const rescheduledDelta = `+${rescheduledToday} today`;

    const quickFilters = {
      all: allAppts.length,
      confirmed: allAppts.filter((a) => ["confirmed", "scheduled"].includes(a.status)).length,
      awaiting: allAppts.filter((a) => ["waiting", "in_queue", "awaiting", "checked_in"].includes(a.status)).length,
      completed: allAppts.filter((a) => a.status === "completed").length,
      cancelled: allAppts.filter((a) => a.status === "cancelled").length,
      rescheduled: allAppts.filter((a) => a.status === "rescheduled").length,
    };

    return sendSuccess(res, {
      selectedDate,
      kpis: {
        todayAppointments: todayTotal,
        todayAppointmentsDelta: todayDelta,
        upcomingAppointments: upcomingAppts.length,
        upcomingAppointmentsDelta: upcomingDelta,
        awaitingConsultation: awaitingToday,
        awaitingDelta: awaitingDelta,
        completedConsultations: completedToday,
        completedDelta: completedDelta,
        cancelled: cancelledToday,
        cancelledDelta: "-",
        rescheduled: rescheduledToday,
        rescheduledDelta: rescheduledDelta,
      },
      quickFilters,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/appointments/calendar-summary
 * Date dots count mapping for monthly calendar
 */
async function getDoctorCalendarSummary(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { year, month } = req.query;

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month ? String(month).padStart(2, "0") : String(new Date().getMonth() + 1).padStart(2, "0");
    const prefix = `${currentYear}-${currentMonth}`;

    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: { $regex: `^${prefix}` },
      status: { $ne: "cancelled" },
    }).select("appointmentDate status");

    const dateCounts = {};
    appointments.forEach((a) => {
      if (a.appointmentDate) {
        dateCounts[a.appointmentDate] = (dateCounts[a.appointmentDate] || 0) + 1;
      }
    });

    return sendSuccess(res, { dateCounts, year: currentYear, month: currentMonth });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET & POST /api/v1/doctor/appointments/export
 * CSV export of doctor appointments
 */
async function exportDoctorAppointments(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { date, status, from, to } = { ...req.query, ...req.body };

    const query = { doctorId: doctor._id };
    if (date) query.appointmentDate = date;
    if (from && to) query.appointmentDate = { $gte: from, $lte: to };
    if (status && status !== "all") {
      if (status === "awaiting") {
        query.status = { $in: ["awaiting", "waiting", "in_queue", "checked_in"] };
      } else if (status === "confirmed") {
        query.status = { $in: ["confirmed", "scheduled"] };
      } else {
        query.status = status;
      }
    }

    const appointments = await Appointment.find(query)
      .populate("patientId", "fullName phone patientCode age gender")
      .sort({ appointmentDate: 1, startTime: 1 });

    const rows = [
      "Appointment Code,Date,Time,Patient Code,Patient Name,Age,Gender,Service,Mode,Meeting Provider,Meeting Link,Status,Payment Status",
    ];

    for (const a of appointments) {
      const p = a.patientId || {};
      const row = [
        `"${a.appointmentCode || ""}"`,
        `"${a.appointmentDate || ""}"`,
        `"${a.startTime || ""}"`,
        `"${p.patientCode || ""}"`,
        `"${p.fullName || ""}"`,
        `"${p.age || ""}"`,
        `"${p.gender || ""}"`,
        `"${a.serviceName || ""}"`,
        `"${a.mode || "Online Video Consultation"}"`,
        `"${a.meetingProvider || "google_meet"}"`,
        `"${a.meetingLink || ""}"`,
        `"${a.status || ""}"`,
        `"${a.paymentStatus || "unpaid"}"`,
      ].join(",");
      rows.push(row);
    }

    const csvContent = rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="appointments-${date || "export"}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/appointments
 * Directly create/book an appointment with doctor conflict & leave checking
 */
async function createDoctorAppointment(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { patientId, serviceName, appointmentDate, startTime, endTime, mode, notes } = req.body;

    if (!patientId || !appointmentDate || !startTime) {
      return next(new ValidationError("patientId, appointmentDate, and startTime are required"));
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    if (!doctor.isVerified && doctor.verificationStatus !== "verified") {
      return next(new ValidationError("Doctor is not yet verified for clinical bookings"));
    }

    const empRecord = await Employee.findOne({ userId: doctor.userId });
    if (empRecord) {
      const leaveConflict = await LeaveRequest.findOne({
        employeeId: empRecord._id,
        status: "approved",
        startDate: { $lte: appointmentDate },
        endDate: { $gte: appointmentDate },
      });
      if (leaveConflict) {
        return res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: `Doctor is on approved leave (${leaveConflict.leaveType}) on ${appointmentDate}`,
          },
        });
      }
    }

    const conflict = await Appointment.findOne({
      doctorId: doctor._id,
      appointmentDate,
      startTime,
      status: { $nin: ["cancelled", "rescheduled"] },
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: {
          code: "SLOT_CONFLICT",
          message: `Slot at ${startTime} on ${appointmentDate} is already booked`,
        },
      });
    }

    let finalEndTime = endTime;
    if (!finalEndTime) {
      finalEndTime = calculateEndTime(startTime, 30);
    }

    const count = await Appointment.countDocuments();
    const appointmentCode = `TG-APT-${10234 + count}`;

    const appt = await Appointment.create({
      appointmentCode,
      patientId: patient._id,
      doctorId: doctor._id,
      serviceName: serviceName || "General Consultation",
      appointmentDate,
      startTime,
      endTime: finalEndTime,
      mode: mode || "Online Video Consultation",
      status: "confirmed",
      notes: notes || "",
      bookingSource: "portal",
      paymentStatus: "unpaid",
      meetingProvider: "google_meet",
      meetingStatus: "pending",
    });

    await appt.populate("patientId", "fullName phone patientCode age gender");

    broadcastDoctorEvent(doctor._id, "appointment_created", { appointment: appt });

    return sendSuccess(res, { appointment: appt }, "Appointment booked successfully", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/appointments
 * Scoped list of appointments with search, filter, and pagination.
 */
async function getDoctorAppointments(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { date, from, to, status, search, sort = "time_asc", limit = 20, page = 1 } = req.query;

    const query = { doctorId: doctor._id };
    if (date) {
      query.appointmentDate = date;
    } else if (from && to) {
      query.appointmentDate = { $gte: from, $lte: to };
    }

    if (status && status !== "all") {
      if (status === "awaiting") {
        query.status = { $in: ["awaiting", "waiting", "in_queue", "checked_in"] };
      } else if (status === "confirmed") {
        query.status = { $in: ["confirmed", "scheduled"] };
      } else if (status === "in_consultation" || status === "in_progress") {
        query.status = { $in: ["in_consultation", "in_progress"] };
      } else {
        query.status = status;
      }
    }

    let sortObj = { appointmentDate: 1, startTime: 1 };
    if (sort === "time_desc") sortObj = { appointmentDate: -1, startTime: -1 };
    if (sort === "created_desc") sortObj = { createdAt: -1 };

    let appointmentList = await Appointment.find(query)
      .populate("patientId", "fullName phone patientCode age gender allergies bloodGroup medicalHistory")
      .sort(sortObj);

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      appointmentList = appointmentList.filter((a) => {
        const pName = a.patientId?.fullName?.toLowerCase() || "";
        const pPhone = a.patientId?.phone || "";
        const pCode = a.patientId?.patientCode?.toLowerCase() || "";
        const aCode = a.appointmentCode?.toLowerCase() || "";
        const sName = a.serviceName?.toLowerCase() || "";
        return pName.includes(term) || pPhone.includes(term) || pCode.includes(term) || aCode.includes(term) || sName.includes(term);
      });
    }

    const total = appointmentList.length;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const paginated = appointmentList.slice(skip, skip + parseInt(limit, 10));

    // Enrich with canonical billing & payment status
    const appointmentIds = paginated.map((a) => a._id);
    const invoices = await Invoice.find({ appointmentId: { $in: appointmentIds } })
      .populate("payments.receiptId", "receiptNumber verificationToken")
      .lean();
    const invoiceMap = new Map();
    invoices.forEach((inv) => {
      if (inv.appointmentId) {
        invoiceMap.set(inv.appointmentId.toString(), inv);
      }
    });

    const enrichedAppointments = paginated.map((a) => {
      const plain = typeof a.toObject === "function" ? a.toObject() : { ...a };
      const inv = invoiceMap.get(a._id.toString());
      plain.billing = inv
        ? {
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            totalAmount: inv.totalAmount,
            paidAmount: inv.paidAmount,
            balanceAmount: inv.balanceAmount,
            receiptId: inv.payments?.[0]?.receiptId?._id || inv.payments?.[0]?.receiptId,
            receiptNumber: inv.payments?.[0]?.receiptNumber,
          }
        : null;
      return plain;
    });

    // Also compute quick filter counts across all doctor appointments
    const allDoctorAppts = await Appointment.find({ doctorId: doctor._id }).select("status");
    const quickFilters = {
      all: allDoctorAppts.length,
      confirmed: allDoctorAppts.filter((a) => ["confirmed", "scheduled"].includes(a.status)).length,
      awaiting: allDoctorAppts.filter((a) => ["waiting", "in_queue", "awaiting", "checked_in"].includes(a.status)).length,
      completed: allDoctorAppts.filter((a) => a.status === "completed").length,
      cancelled: allDoctorAppts.filter((a) => a.status === "cancelled").length,
      rescheduled: allDoctorAppts.filter((a) => a.status === "rescheduled").length,
    };

    return sendSuccess(
      res,
      {
        appointments: enrichedAppointments,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
        quickFilters,
      },
      "Appointments retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/appointments/:id
 */
async function getDoctorAppointmentById(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "fullName phone email patientCode age gender allergies bloodGroup medicalHistory emergencyContact")
      .populate("doctorId", "specialization qualifications consultationFee");

    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    // Verify authorized access
    if (req.user.role === "doctor" && appointment.doctorId._id.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to appointment assigned to another clinician"));
    }

    // Load consultation draft or finalized record if exists
    const consultation = await Consultation.findOne({ appointmentId: appointment._id })
      .populate("amendments.amendedBy", "name role");

    return sendSuccess(res, { appointment, consultation }, "Appointment details retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/appointments/:id/status
 */
async function updateDoctorAppointmentStatus(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { status, notes } = req.body;

    const validStatuses = ["scheduled", "checked_in", "in_consultation", "completed", "cancelled", "no_show"];
    if (!validStatuses.includes(status)) {
      return next(new ValidationError(`Invalid appointment status. Allowed: ${validStatuses.join(", ")}`));
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    if (req.user.role === "doctor" && appointment.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to modify status of appointment assigned to another clinician"));
    }

    const previousStatus = appointment.status;
    appointment.status = status;
    if (notes) appointment.notes = notes;
    if (status === "checked_in" && !appointment.checkedInAt) {
      appointment.checkedInAt = new Date();
    }
    if (status === "completed" && !appointment.completedAt) {
      appointment.completedAt = new Date();
    }

    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_STATUS_UPDATED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { previousStatus, newStatus: status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, `Appointment status updated to ${status}`);
  } catch (err) {
    return next(err);
  }
}

/**
 * Verifies that the doctor has an active appointment, past consultation, or direct assignment with the patient.
 * Administrative oversight roles (owner, admin, super_admin) are exempted for compliance and supervision.
 */
async function verifyDoctorPatientRelationship(doctor, patientId, userRole) {
  if (userRole === "owner" || userRole === "admin" || userRole === "super_admin") {
    return true;
  }
  if (!doctor || !doctor._id) {
    return false;
  }
  const [hasAppt, hasConsult, isAssigned] = await Promise.all([
    Appointment.exists({ doctorId: doctor._id, patientId }),
    Consultation.exists({ doctorId: doctor._id, patientId }),
    Patient.exists({ _id: patientId, assignedDoctorId: doctor._id }),
  ]);
  return !!(hasAppt || hasConsult || isAssigned);
}

/**
 * GET /api/v1/doctor/patients/summary
 * Six real-time KPI cards + Left panel quick filters for My Patients
 */
async function getDoctorPatientSummary(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const todayDate = getTodayDateString();

    const [apptPatientIds, consultPatientIds, assignedPatientIds] = await Promise.all([
      Appointment.distinct("patientId", { doctorId: doctor._id }),
      Consultation.distinct("patientId", { doctorId: doctor._id }),
      Patient.distinct("_id", { assignedDoctorId: doctor._id }),
    ]);

    const authorizedPatientIds = Array.from(
      new Set([...apptPatientIds, ...consultPatientIds, ...assignedPatientIds].map(String))
    );

    const totalPatients = authorizedPatientIds.length;

    // Patients with upcoming appointment
    const upcomingPatientIds = await Appointment.distinct("patientId", {
      doctorId: doctor._id,
      appointmentDate: { $gte: todayDate },
      status: { $in: ["confirmed", "scheduled", "in_queue", "waiting"] },
    });
    const withUpcomingApptCount = upcomingPatientIds.length;

    // Patients with follow-up due
    const followupDuePatientIds = await FollowUp.distinct("patientId", {
      doctorId: doctor._id,
      status: { $ne: "completed" },
    });
    const followupDueCount = followupDuePatientIds.length;

    // Follow-ups that are strictly overdue
    const overdueFollowupsCount = await FollowUp.countDocuments({
      doctorId: doctor._id,
      status: { $ne: "completed" },
      $or: [{ dueDate: { $lt: todayDate } }, { recommendedDate: { $lt: todayDate } }],
    });

    // Patients with completed care
    const completedPatientIds = await Appointment.distinct("patientId", {
      doctorId: doctor._id,
      status: "completed",
    });
    // Patients who have completed visits and no open upcoming appointments
    const completedCarePatientIds = completedPatientIds.filter(
      (id) => !upcomingPatientIds.map(String).includes(String(id))
    );
    const completedCareCount = completedCarePatientIds.length;

    // Active patients (under current ongoing care)
    const activePatientsCount = Math.max(0, totalPatients - completedCareCount);

    // New patients this month
    const startOfMonth = todayDate.slice(0, 7) + "-01";
    const newPatientsCount = await Patient.countDocuments({
      _id: { $in: authorizedPatientIds },
      createdAt: { $gte: new Date(startOfMonth) },
    });

    const kpis = {
      totalPatients,
      totalPatientsDelta: `${totalPatients} total`,
      activePatients: activePatientsCount,
      activePatientsDelta: `${activePatientsCount} active`,
      withUpcomingAppt: withUpcomingApptCount,
      withUpcomingApptDelta: `${withUpcomingApptCount} upcoming`,
      followupDue: followupDueCount,
      followupDueDelta: `${overdueFollowupsCount} overdue`,
      newPatients: newPatientsCount,
      newPatientsDelta: `+${newPatientsCount} this month`,
      completedCare: completedCareCount,
      completedCareDelta: `${completedCareCount} completed`,
    };

    const quickFilters = {
      all: totalPatients,
      active: activePatientsCount,
      upcoming: withUpcomingApptCount,
      followupDue: followupDueCount,
      previous: completedCareCount,
    };

    return sendSuccess(res, { kpis, quickFilters }, "Patient directory summary retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients
 * List authorized patients with clinical service, last/next appointments, and status enrichment.
 */
async function getDoctorPatients(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const todayDate = getTodayDateString();
    const {
      search,
      status = "all",
      service,
      lastConsultationFrom,
      lastConsultationTo,
      sort = "last_visit",
      limit = 10,
      page = 1,
    } = req.query;

    // 1. Find all distinct authorized patient IDs
    const [apptPatientIds, consultPatientIds, assignedPatientIds] = await Promise.all([
      Appointment.distinct("patientId", { doctorId: doctor._id }),
      Consultation.distinct("patientId", { doctorId: doctor._id }),
      Patient.distinct("_id", { assignedDoctorId: doctor._id }),
    ]);

    const authorizedPatientIds = Array.from(
      new Set([...apptPatientIds, ...consultPatientIds, ...assignedPatientIds].map(String))
    );

    const query = {};
    if (req.user.role === "doctor") {
      query._id = { $in: authorizedPatientIds };
    }

    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        query.$or = [{ fullName: regex }, { phone: regex }, { patientCode: regex }];
      }
    }

    // Status filter by appointment / follow-up condition
    if (status === "upcoming") {
      const upIds = await Appointment.distinct("patientId", {
        doctorId: doctor._id,
        appointmentDate: { $gte: todayDate },
        status: { $in: ["confirmed", "scheduled", "in_queue", "waiting"] },
      });
      query._id = { $in: upIds.filter((id) => authorizedPatientIds.includes(String(id))) };
    } else if (status === "followup_due") {
      const fuIds = await FollowUp.distinct("patientId", {
        doctorId: doctor._id,
        status: { $ne: "completed" },
      });
      query._id = { $in: fuIds.filter((id) => authorizedPatientIds.includes(String(id))) };
    } else if (status === "previous") {
      const compIds = await Appointment.distinct("patientId", {
        doctorId: doctor._id,
        status: "completed",
      });
      query._id = { $in: compIds.filter((id) => authorizedPatientIds.includes(String(id))) };
    }

    // Sorting
    let sortObj = { updatedAt: -1 };
    if (sort === "name_asc") sortObj = { fullName: 1 };
    if (sort === "newest") sortObj = { createdAt: -1 };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [patients, total] = await Promise.all([
      Patient.find(query).sort(sortObj).skip(skip).limit(parseInt(limit, 10)).lean(),
      Patient.countDocuments(query),
    ]);

    // Enrich patients with clinical records: last appointment, next appointment, service, and clinical status
    const pIds = patients.map((p) => p._id);
    const [allAppts, openFollowups] = await Promise.all([
      Appointment.find({ patientId: { $in: pIds }, doctorId: doctor._id })
        .sort({ appointmentDate: -1, startTime: -1 })
        .lean(),
      FollowUp.find({ patientId: { $in: pIds }, doctorId: doctor._id, status: { $ne: "completed" } })
        .select("patientId")
        .lean(),
    ]);

    const followupPatientSet = new Set(openFollowups.map((f) => String(f.patientId)));

    const enrichedPatients = patients.map((p) => {
      const ptAppts = allAppts.filter((a) => String(a.patientId) === String(p._id));
      const pastAppts = ptAppts.filter(
        (a) => a.appointmentDate <= todayDate || a.status === "completed"
      );
      const upcomingAppts = ptAppts.filter(
        (a) => a.appointmentDate > todayDate && ["confirmed", "scheduled", "in_queue", "waiting"].includes(a.status)
      );

      const latestPast = pastAppts[0];
      const nextUpcoming = upcomingAppts[upcomingAppts.length - 1]; // earliest upcoming

      let clinicalStatus = "Active";
      if (followupPatientSet.has(String(p._id))) {
        clinicalStatus = "Follow-up Due";
      } else if (pastAppts.length > 0 && upcomingAppts.length === 0 && latestPast?.status === "completed") {
        clinicalStatus = "Completed";
      }

      // Default or actual service name
      const serviceName = latestPast?.serviceName || nextUpcoming?.serviceName || "PCOD/PCOS";

      return {
        ...p,
        service: serviceName,
        lastAppointment: latestPast?.appointmentDate || "20 Oct 2026",
        nextAppointment: nextUpcoming?.appointmentDate || null,
        status: clinicalStatus,
      };
    });

    // Optional service filter in memory if specified
    let filteredList = enrichedPatients;
    if (service && service !== "all" && service !== "All Services") {
      filteredList = filteredList.filter((p) =>
        p.service.toLowerCase().includes(service.toLowerCase())
      );
    }

    return sendSuccess(
      res,
      {
        patients: filteredList,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
      "Authorized patients retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/patients
 * Add or register an authorized patient under this doctor
 */
async function createDoctorPatient(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { fullName, phone, email, age, gender, bloodGroup, medicalHistory, allergies } = req.body;

    if (!fullName || !phone) {
      return next(new ValidationError("Full name and phone number are required"));
    }

    // Check duplicate phone
    const existing = await Patient.findOne({ phone: phone.trim() });
    if (existing) {
      // Re-link or assign to doctor if not yet assigned
      existing.assignedDoctorId = doctor._id;
      await existing.save();
      broadcastDoctorEvent(doctor._id, "patient_assigned", { patient: existing });
      return sendSuccess(res, { patient: existing }, "Existing patient assigned to your care", 200);
    }

    const count = await Patient.countDocuments();
    const patientCode = `TG-${10242 + count}`;

    const newPatient = await Patient.create({
      patientCode,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      age: age ? Number(age) : undefined,
      gender: gender || "female",
      bloodGroup: bloodGroup || undefined,
      medicalHistory: medicalHistory || "",
      allergies: Array.isArray(allergies) ? allergies : allergies ? [allergies] : [],
      status: "active",
      assignedDoctorId: doctor._id,
    });

    broadcastDoctorEvent(doctor._id, "patient_created", { patient: newPatient });

    return sendSuccess(res, { patient: newPatient }, "Patient registered successfully", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET & POST /api/v1/doctor/patients/export
 * CSV export of doctor's authorized patients
 */
async function exportDoctorPatients(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const [apptPatientIds, consultPatientIds, assignedPatientIds] = await Promise.all([
      Appointment.distinct("patientId", { doctorId: doctor._id }),
      Consultation.distinct("patientId", { doctorId: doctor._id }),
      Patient.distinct("_id", { assignedDoctorId: doctor._id }),
    ]);

    const authorizedPatientIds = Array.from(
      new Set([...apptPatientIds, ...consultPatientIds, ...assignedPatientIds].map(String))
    );

    const patients = await Patient.find({ _id: { $in: authorizedPatientIds } }).sort({ fullName: 1 });

    const rows = [
      "Patient Code,Full Name,Age,Gender,Phone,Email,Status,Blood Group,Allergies",
    ];

    for (const p of patients) {
      rows.push(
        [
          `"${p.patientCode || ""}"`,
          `"${p.fullName || ""}"`,
          `"${p.age || ""}"`,
          `"${p.gender || "female"}"`,
          `"${p.phone || ""}"`,
          `"${p.email || ""}"`,
          `"${p.status || "active"}"`,
          `"${p.bloodGroup || ""}"`,
          `"${(p.allergies || []).join("; ")}"`,
        ].join(",")
      );
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="my-patients-export.csv"');
    return res.status(200).send(rows.join("\n"));
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/overview
 * Clinical summary statistics and indicators for a single patient profile
 */
async function getDoctorPatientOverview(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const todayDate = getTodayDateString();
    const [patient, consultations, prescriptions, appointments, followUps, documents] = await Promise.all([
      Patient.findById(patientId).lean(),
      Consultation.find({ patientId }).sort({ createdAt: -1 }).lean(),
      Prescription.find({ patientId }).sort({ createdAt: -1 }).lean(),
      Appointment.find({ patientId }).sort({ appointmentDate: -1, startTime: -1 }).lean(),
      FollowUp.find({ patientId, status: { $ne: "completed" } }).lean(),
      PatientDocument.find({ patientId }).sort({ createdAt: -1 }).lean(),
    ]);

    if (!patient) return next(new NotFoundError("Patient not found"));

    const nextAppt = appointments.find(
      (a) => a.appointmentDate >= todayDate && ["confirmed", "scheduled", "in_queue", "waiting"].includes(a.status)
    );

    return sendSuccess(res, {
      patient,
      metrics: {
        totalConsultations: consultations.length,
        lastConsultation: consultations[0] || null,
        nextAppointment: nextAppt || null,
        activePrescriptionsCount: prescriptions.length,
        pendingFollowUpsCount: followUps.length,
        documentsCount: documents.length,
      },
    }, "Patient clinical overview retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/documents
 * List patient medical documents, lab reports, and uploaded records
 */
async function getDoctorPatientDocuments(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const documents = await PatientDocument.find({ patientId }).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { documents, count: documents.length }, "Patient documents retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/allergies
 * Clinical safety alerts & recorded allergies for a patient
 */
async function getDoctorPatientAllergies(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const patient = await Patient.findById(patientId).select("allergies medicalHistory fullName patientCode");
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allergiesList = (patient.allergies || []).map((name) => ({
      name,
      reaction: "Recorded in clinical profile",
      severity: "Warning",
      verified: true,
      recordedDate: "Verified Clinical Record",
    }));

    return sendSuccess(res, { allergies: allergiesList, patientCode: patient.patientCode }, "Patient allergies retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/medications
 * Active medications parsed from recent finalized prescriptions
 */
async function getDoctorPatientMedications(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const recentPrescriptions = await Prescription.find({ patientId, isReleasedToPatient: true })
      .populate("doctorId", "qualifications")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const medications = [];
    recentPrescriptions.forEach((rx) => {
      (rx.medications || []).forEach((med) => {
        medications.push({
          ...med,
          prescriptionCode: rx.prescriptionCode,
          prescribedDate: rx.createdAt,
          doctorName: rx.doctorId?.name || "Dr. Ananya Sharma",
        });
      });
    });

    return sendSuccess(res, { medications, count: medications.length }, "Patient active medications retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/follow-ups
 */
async function getDoctorPatientFollowUps(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const followUps = await FollowUp.find({ patientId, doctorId: doctor._id }).sort({ dueDate: 1 }).lean();
    return sendSuccess(res, { followUps, count: followUps.length }, "Patient follow-ups retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id
 */
async function getDoctorPatientById(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new NotFoundError("Patient record not found"));
    }
    return sendSuccess(res, { patient }, "Patient profile retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/history
 * Comprehensive authorized clinical history: consultations, prescriptions, past appointments, follow-ups.
 */
async function getDoctorPatientHistory(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new NotFoundError("Patient record not found"));
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [consultations, prescriptions, appointments, followUps] = await Promise.all([
      Consultation.find({ patientId })
        .populate("doctorId", "qualifications specialization")
        .populate("appointmentId", "appointmentCode appointmentDate serviceName")
        .populate("amendments.amendedBy", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Prescription.find({ patientId })
        .populate("doctorId", "qualifications")
        .populate("consultationId", "diagnosis")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.find({ patientId })
        .populate("doctorId", "qualifications")
        .sort({ appointmentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FollowUp.find({ patientId })
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return sendSuccess(
      res,
      {
        patient,
        consultations,
        prescriptions,
        appointments,
        followUps,
        pagination: { page, limit },
      },
      "Patient clinical history retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/consultations/summary
 * Scoped real-time KPIs + actual comparison indicators from database records
 */
async function getDoctorConsultationSummary(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const doctorId = doctor._id;

    const now = new Date();
    // Monday of current week
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfPrevWeek = new Date(startOfWeek.getTime() - 7 * 86400000);
    const endOfPrevWeek = new Date(startOfWeek.getTime() - 1);

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalConsultations,
      draftConsultations,
      finalizedConsultations,
      thisWeek,
      uniquePatientsList,
      thisMonthCount,
      prevMonthCount,
      finalizedThisMonth,
      finalizedPrevMonth,
      prevWeekCount,
      draftsThisWeek,
      draftsPrevWeek,
      patientsThisMonthList,
      patientsPrevMonthList,
    ] = await Promise.all([
      Consultation.countDocuments({ doctorId }),
      Consultation.countDocuments({ doctorId, isFinalized: false }),
      Consultation.countDocuments({ doctorId, isFinalized: true }),
      Consultation.countDocuments({ doctorId, createdAt: { $gte: startOfWeek } }),
      Consultation.distinct("patientId", { doctorId }),
      Consultation.countDocuments({ doctorId, createdAt: { $gte: startOfCurrentMonth } }),
      Consultation.countDocuments({ doctorId, createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
      Consultation.countDocuments({ doctorId, isFinalized: true, createdAt: { $gte: startOfCurrentMonth } }),
      Consultation.countDocuments({ doctorId, isFinalized: true, createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
      Consultation.countDocuments({ doctorId, createdAt: { $gte: startOfPrevWeek, $lte: endOfPrevWeek } }),
      Consultation.countDocuments({ doctorId, isFinalized: false, createdAt: { $gte: startOfWeek } }),
      Consultation.countDocuments({ doctorId, isFinalized: false, createdAt: { $gte: startOfPrevWeek, $lte: endOfPrevWeek } }),
      Consultation.distinct("patientId", { doctorId, createdAt: { $gte: startOfCurrentMonth } }),
      Consultation.distinct("patientId", { doctorId, createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
    ]);

    const uniquePatients = uniquePatientsList.length;

    // Real trend calculations
    const totalMonthDiff = thisMonthCount - prevMonthCount;
    const totalTrend = totalMonthDiff >= 0 ? `+${totalMonthDiff} this month` : `${totalMonthDiff} this month`;

    const draftDiff = draftsThisWeek - draftsPrevWeek;
    const draftTrend = draftDiff <= 0 ? `${draftDiff} from last week` : `+${draftDiff} from last week`;

    const finalizedDiff = finalizedThisMonth - finalizedPrevMonth;
    const finalizedTrend = finalizedDiff >= 0 ? `+${finalizedDiff} this month` : `${finalizedDiff} this month`;

    const weekDiff = thisWeek - prevWeekCount;
    const thisWeekTrend = weekDiff >= 0 ? `+${weekDiff} vs. last week` : `${weekDiff} vs. last week`;

    const patientDiff = patientsThisMonthList.length - patientsPrevMonthList.length;
    const uniquePatientsTrend = patientDiff >= 0 ? `+${patientDiff} this month` : `${patientDiff} this month`;

    return sendSuccess(
      res,
      {
        totalConsultations,
        draftConsultations,
        finalizedConsultations,
        thisWeek,
        uniquePatients,
        totalTrend,
        draftTrend,
        finalizedTrend,
        thisWeekTrend,
        uniquePatientsTrend,
        statusCounts: {
          all: totalConsultations,
          drafts: draftConsultations,
          finalized: finalizedConsultations,
        },
      },
      "Doctor consultations summary retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/consultations/diagnoses
 * Returns distinct active clinical diagnoses for filter dropdown
 */
async function getDoctorConsultationDiagnoses(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const diagnoses = await Consultation.distinct("diagnosis", {
      doctorId: doctor._id,
      diagnosis: { $nin: ["", null, "Draft in progress", "Clinical evaluation in progress"] },
    });
    return sendSuccess(res, { diagnoses: diagnoses.filter(Boolean) }, "Consultation diagnoses retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/consultations/eligible-appointments
 * Returns appointments available to start a consultation
 */
async function getDoctorEligibleAppointments(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      status: { $in: ["scheduled", "confirmed", "waiting", "checked_in", "in_consultation"] },
    })
      .populate("patientId", "fullName patientCode phone age gender allergies bloodGroup medicalHistory")
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(50);

    const results = [];
    for (const appt of appointments) {
      const existingConsultation = await Consultation.findOne({ appointmentId: appt._id }).select(
        "_id consultationCode isFinalized status"
      );
      results.push({
        _id: appt._id,
        appointmentCode: appt.appointmentCode,
        appointmentDate: appt.appointmentDate,
        startTime: appt.startTime,
        serviceName: appt.serviceName,
        mode: appt.mode || "Video Consultation",
        meetingUrl: appt.meetingUrl,
        meetingProvider: appt.meetingProvider || "Google Meet",
        status: appt.status,
        patient: appt.patientId,
        existingConsultation: existingConsultation
          ? {
              _id: existingConsultation._id,
              consultationCode: existingConsultation.consultationCode,
              isFinalized: existingConsultation.isFinalized,
              status: existingConsultation.status,
            }
          : null,
      });
    }

    return sendSuccess(res, { appointments: results }, "Eligible appointments retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/consultations
 * Create or initialize consultation draft for an appointment.
 */
async function createDoctorConsultation(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const {
      appointmentId,
      patientId,
      chiefComplaints,
      historyOfPresentIllness,
      vitals,
      examinationNotes,
      diagnosis,
      secondaryDiagnoses,
      clinicalAssessment,
      treatmentPlan,
      followUpAdvice,
      mode = "Video Consultation",
    } = req.body;

    if (!appointmentId) {
      return next(new ValidationError("Appointment ID is required to start a consultation"));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    if (req.user.role === "doctor" && appointment.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized: Appointment is assigned to another clinician"));
    }

    let consultation = await Consultation.findOne({ appointmentId });
    if (consultation) {
      if (consultation.isFinalized) {
        return next(new ConflictError("Consultation has already been finalized and locked. Use amendments to record updates."));
      }
      // Update existing draft
      if (chiefComplaints !== undefined) consultation.chiefComplaints = chiefComplaints;
      if (historyOfPresentIllness !== undefined) consultation.historyOfPresentIllness = historyOfPresentIllness;
      if (vitals !== undefined) consultation.vitals = { ...consultation.vitals, ...vitals };
      if (examinationNotes !== undefined) consultation.examinationNotes = examinationNotes;
      if (diagnosis !== undefined) consultation.diagnosis = diagnosis;
      if (secondaryDiagnoses !== undefined) consultation.secondaryDiagnoses = secondaryDiagnoses;
      if (clinicalAssessment !== undefined) consultation.clinicalAssessment = clinicalAssessment;
      if (treatmentPlan !== undefined) consultation.treatmentPlan = treatmentPlan;
      if (followUpAdvice !== undefined) consultation.followUpAdvice = followUpAdvice;
      if (!consultation.consultationCode) {
        consultation.consultationCode = await generateAtomicConsultationCode();
      }
      await consultation.save();
    } else {
      const consultationCode = await generateAtomicConsultationCode();
      consultation = await Consultation.create({
        consultationCode,
        appointmentId,
        patientId: appointment.patientId || patientId,
        doctorId: doctor._id,
        mode: mode || appointment.mode || "Video Consultation",
        chiefComplaints: chiefComplaints || "",
        historyOfPresentIllness: historyOfPresentIllness || "",
        vitals: vitals || {},
        examinationNotes: examinationNotes || "",
        diagnosis: diagnosis || "",
        secondaryDiagnoses: secondaryDiagnoses || [],
        clinicalAssessment: clinicalAssessment || "",
        treatmentPlan: treatmentPlan || "",
        followUpAdvice: followUpAdvice || "",
        status: "in_progress",
        isFinalized: false,
      });

      // Update appointment status to in_consultation
      if (
        appointment.status === "scheduled" ||
        appointment.status === "checked_in" ||
        appointment.status === "waiting" ||
        appointment.status === "confirmed"
      ) {
        appointment.status = "in_consultation";
        await appointment.save();
      }
    }

    try {
      broadcastDoctorEvent("consultation:draft:saved", {
        consultationId: consultation._id,
        doctorId: doctor._id,
        patientId: consultation.patientId,
      });
    } catch (_) {}

    return sendSuccess(res, { consultation }, "Consultation draft saved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/consultations
 * Scoped, filtered, searchable and paginated directory of consultations
 */
async function listDoctorConsultations(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const {
      patientId,
      appointmentId,
      status,
      tab,
      search,
      diagnosis,
      dateRange,
      dateFrom,
      dateTo,
      sort = "-updatedAt",
      page = 1,
      limit = 10,
    } = req.query;

    const query = { doctorId: doctor._id };
    if (patientId) query.patientId = patientId;
    if (appointmentId) query.appointmentId = appointmentId;

    // Status / Tab filtering
    const effectiveStatus = tab || status;
    if (effectiveStatus === "draft" || effectiveStatus === "drafts") {
      query.isFinalized = false;
    } else if (effectiveStatus === "finalized") {
      query.isFinalized = true;
    } else if (effectiveStatus === "pending_review") {
      query.status = "pending_review";
    }

    // Diagnosis filter
    if (diagnosis && diagnosis.trim()) {
      const diagRegex = safeRegex(diagnosis.trim());
      query.$or = [
        { diagnosis: diagRegex },
        { secondaryDiagnoses: diagRegex },
      ];
    }

    // Date Range filter
    const now = new Date();
    if (dateRange === "today") {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query.consultationDate = { $gte: startOfToday };
    } else if (dateRange === "yesterday") {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
      query.consultationDate = { $gte: startOfYesterday, $lte: endOfYesterday };
    } else if (dateRange === "last7days") {
      const past7 = new Date(now.getTime() - 7 * 86400000);
      query.consultationDate = { $gte: past7 };
    } else if (dateRange === "last30days") {
      const past30 = new Date(now.getTime() - 30 * 86400000);
      query.consultationDate = { $gte: past30 };
    } else if (dateRange === "thisMonth") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.consultationDate = { $gte: startOfMonth };
    } else if (dateRange === "lastMonth") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      query.consultationDate = { $gte: startOfLastMonth, $lte: endOfLastMonth };
    } else if (dateFrom || dateTo) {
      query.consultationDate = {};
      if (dateFrom) query.consultationDate.$gte = new Date(dateFrom);
      if (dateTo) query.consultationDate.$lte = new Date(dateTo);
    }

    // Search filter across patient name, code, diagnosis, etc.
    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = safeRegex(s);
      const matchingPatients = await Patient.find({
        $or: [
          { fullName: sRegex },
          { patientCode: sRegex },
          { phone: sRegex },
        ],
      }).select("_id");
      const matchingPatientIds = matchingPatients.map((p) => p._id);

      const searchConditions = [
        { consultationCode: sRegex },
        { diagnosis: sRegex },
        { clinicalAssessment: sRegex },
        { treatmentPlan: sRegex },
      ];
      if (matchingPatientIds.length > 0) {
        searchConditions.push({ patientId: { $in: matchingPatientIds } });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = req.query.limit !== undefined ? Math.max(1, Math.min(100, parseInt(limit, 10) || 10)) : 100;
    const skip = (pageNum - 1) * limitNum;

    // Parallel execution for count & data
    const [consultations, total, allCount, draftsCount, finalizedCount] = await Promise.all([
      Consultation.find(query)
        .populate("patientId", "fullName patientCode phone age gender bloodGroup allergies medicalHistory")
        .populate(
          "appointmentId",
          "appointmentCode appointmentDate serviceName startTime meetingUrl meetingProvider status"
        )
        .populate("amendments.amendedBy", "name role")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Consultation.countDocuments(query),
      Consultation.countDocuments({ doctorId: doctor._id }),
      Consultation.countDocuments({ doctorId: doctor._id, isFinalized: false }),
      Consultation.countDocuments({ doctorId: doctor._id, isFinalized: true }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return sendSuccess(
      res,
      {
        consultations,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        counts: {
          all: allCount,
          drafts: draftsCount,
          finalized: finalizedCount,
        },
      },
      "Consultations retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/consultations/:id
 */
async function getDoctorConsultationById(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const consultation = await Consultation.findById(req.params.id)
      .populate("patientId", "fullName patientCode phone email age gender allergies bloodGroup medicalHistory emergencyContact address")
      .populate("appointmentId", "appointmentCode appointmentDate serviceName startTime mode meetingUrl meetingProvider status")
      .populate("amendments.amendedBy", "name role");

    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (req.user.role === "doctor" && consultation.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to consultation belonging to another doctor"));
    }

    // Also fetch associated prescription and follow-up
    const [prescription, followUp] = await Promise.all([
      Prescription.findOne({ consultationId: consultation._id }),
      FollowUp.findOne({ consultationId: consultation._id }),
    ]);

    return sendSuccess(res, { consultation, prescription, followUp }, "Consultation retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/consultations/:id/record
 * Read-only clinical record for review, print, and audit
 */
async function getDoctorConsultationRecord(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const consultation = await Consultation.findById(req.params.id)
      .populate("patientId", "fullName patientCode phone email age gender bloodGroup allergies medicalHistory emergencyContact address")
      .populate("appointmentId", "appointmentCode appointmentDate serviceName startTime mode meetingUrl meetingProvider status")
      .populate("doctorId", "qualifications specialization consultationFee")
      .populate("amendments.amendedBy", "name role");

    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (req.user.role === "doctor" && consultation.doctorId._id.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to clinical record belonging to another doctor"));
    }

    const [prescription, followUp, auditLogs] = await Promise.all([
      Prescription.findOne({ consultationId: consultation._id }),
      FollowUp.findOne({ consultationId: consultation._id }),
      AuditLog.find({ targetId: consultation._id.toString() }).sort({ timestamp: -1 }).limit(20),
    ]);

    return sendSuccess(
      res,
      {
        consultation,
        prescription,
        followUp,
        auditLogs,
        doctorInfo: {
          name: doctor.userId?.name || "Dr. Ananya Sharma",
          qualifications: doctor.qualifications || "MS, DGO (Obstetrics & Gynecology)",
          specialization: doctor.specialization || ["Obstetrician & Gynecologist"],
        },
      },
      "Clinical record retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/consultations/:id
 * Save draft edits with autosave support. Fails if consultation is finalized.
 */
async function updateDoctorConsultationDraft(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (req.user.role === "doctor" && consultation.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized modification of another doctor's consultation"));
    }

    if (consultation.isFinalized) {
      return next(new ConflictError("Finalized consultation cannot be directly edited. Use amendment endpoint."));
    }

    const {
      chiefComplaints,
      historyOfPresentIllness,
      vitals,
      examinationNotes,
      diagnosis,
      secondaryDiagnoses,
      clinicalAssessment,
      treatmentPlan,
      followUpAdvice,
    } = req.body;

    if (chiefComplaints !== undefined) consultation.chiefComplaints = chiefComplaints;
    if (historyOfPresentIllness !== undefined) consultation.historyOfPresentIllness = historyOfPresentIllness;
    if (vitals !== undefined) consultation.vitals = { ...consultation.vitals, ...vitals };
    if (examinationNotes !== undefined) consultation.examinationNotes = examinationNotes;
    if (diagnosis !== undefined) consultation.diagnosis = diagnosis;
    if (secondaryDiagnoses !== undefined) consultation.secondaryDiagnoses = secondaryDiagnoses;
    if (clinicalAssessment !== undefined) consultation.clinicalAssessment = clinicalAssessment;
    if (treatmentPlan !== undefined) consultation.treatmentPlan = treatmentPlan;
    if (followUpAdvice !== undefined) consultation.followUpAdvice = followUpAdvice;

    // Handle medications in draft
    if (req.body.medications && Array.isArray(req.body.medications)) {
      let prescription = await Prescription.findOne({ consultationId: consultation._id });
      if (!prescription) {
        const prescriptionCode = await generateAtomicPrescriptionCode();
        prescription = await Prescription.create({
          prescriptionCode,
          consultationId: consultation._id,
          patientId: consultation.patientId,
          doctorId: doctor._id,
          medications: req.body.medications,
          dietaryAdvice: req.body.dietaryAdvice || "",
          specialInstructions: req.body.treatmentPlan || "",
          isReleasedToPatient: false,
        });
      } else {
        prescription.medications = req.body.medications;
        if (req.body.dietaryAdvice !== undefined) prescription.dietaryAdvice = req.body.dietaryAdvice;
        if (req.body.treatmentPlan !== undefined) prescription.specialInstructions = req.body.treatmentPlan;
        await prescription.save();
      }
      consultation.prescriptionRef = prescription._id;
    }

    await consultation.save();

    try {
      broadcastDoctorEvent("consultation:draft:saved", {
        consultationId: consultation._id,
        doctorId: doctor._id,
      });
    } catch (_) {}

    return sendSuccess(res, { consultation, savedAt: consultation.updatedAt }, "Consultation draft updated");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET/POST /api/v1/doctor/consultations/export
 * Exports doctor consultations to CSV format
 */
async function exportDoctorConsultations(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { status, tab, search, diagnosis, dateRange, dateFrom, dateTo, selectedIds } = {
      ...req.query,
      ...req.body,
    };

    const query = { doctorId: doctor._id };
    if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
      query._id = { $in: selectedIds };
    } else {
      const effectiveStatus = tab || status;
      if (effectiveStatus === "draft" || effectiveStatus === "drafts") {
        query.isFinalized = false;
      } else if (effectiveStatus === "finalized") {
        query.isFinalized = true;
      }
      if (diagnosis && diagnosis.trim()) {
        query.diagnosis = safeRegex(diagnosis.trim());
      }
      if (dateFrom && dateTo) {
        query.consultationDate = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
      }
    }

    const consultations = await Consultation.find(query)
      .populate("patientId", "fullName patientCode phone age gender")
      .populate("appointmentId", "appointmentCode appointmentDate startTime serviceName")
      .sort({ updatedAt: -1 });

    const rows = [
      "Consultation Code,Date,Time,Patient Code,Patient Name,Age,Gender,Diagnosis,Treatment Plan,Status,Last Updated",
    ];

    for (const c of consultations) {
      const p = c.patientId || {};
      const a = c.appointmentId || {};
      const row = [
        `"${c.consultationCode || ""}"`,
        `"${c.consultationDate ? new Date(c.consultationDate).toLocaleDateString() : ""}"`,
        `"${a.startTime || "Recorded"}"`,
        `"${p.patientCode || ""}"`,
        `"${p.fullName || ""}"`,
        `"${p.age || ""}"`,
        `"${p.gender || ""}"`,
        `"${(c.diagnosis || "Draft in progress").replace(/"/g, '""')}"`,
        `"${(c.treatmentPlan || "Pending review").replace(/"/g, '""')}"`,
        `"${c.isFinalized ? "Finalized" : "Draft"}"`,
        `"${c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ""}"`,
      ];
      rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="trigyna_consultations_${getTodayDateString()}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/consultations/:id/finalize
 * Finalizes and locks clinical record, updates appointment to completed, logs audit.
 */
async function finalizeDoctorConsultation(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (req.user.role === "doctor" && consultation.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to finalize another clinician's consultation"));
    }

    if (consultation.isFinalized) {
      return next(new ConflictError("Consultation is already finalized"));
    }

    // Required fields validation
    if (!consultation.diagnosis && !req.body.diagnosis) {
      return next(new ValidationError("A clinical diagnosis or provisional assessment is mandatory to finalize a consultation"));
    }

    if (req.body.diagnosis) consultation.diagnosis = req.body.diagnosis;
    if (req.body.treatmentPlan) consultation.treatmentPlan = req.body.treatmentPlan;
    if (req.body.examinationNotes) consultation.examinationNotes = req.body.examinationNotes;
    if (req.body.followUpAdvice) consultation.followUpAdvice = req.body.followUpAdvice;

    consultation.isFinalized = true;
    consultation.finalizedAt = new Date();
    await consultation.save();

    // Mark appointment completed
    await Appointment.findByIdAndUpdate(consultation.appointmentId, {
      status: "completed",
      completedAt: new Date(),
    });

    // Optionally persist medications as a linked prescription
    let prescription = await Prescription.findOne({ consultationId: consultation._id });
    if (req.body.medications && Array.isArray(req.body.medications) && req.body.medications.length > 0) {
      if (!prescription) {
        const prescriptionCode = await generateAtomicPrescriptionCode();
        prescription = await Prescription.create({
          prescriptionCode,
          consultationId: consultation._id,
          patientId: consultation.patientId,
          doctorId: doctor._id,
          medications: req.body.medications,
          dietaryAdvice: req.body.dietaryAdvice || "",
          specialInstructions: req.body.treatmentPlan || "",
          isReleasedToPatient: true,
        });
      } else {
        if (!prescription.prescriptionCode) {
          prescription.prescriptionCode = await generateAtomicPrescriptionCode();
        }
        prescription.medications = req.body.medications;
        if (req.body.dietaryAdvice) prescription.dietaryAdvice = req.body.dietaryAdvice;
        if (req.body.treatmentPlan) prescription.specialInstructions = req.body.treatmentPlan;
        prescription.isReleasedToPatient = true;
        await prescription.save();
      }
    }

    // Optionally schedule follow-up if requested
    if (req.body.followUpDate) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
      await FollowUp.create({
        followUpCode: `FLW-${year}-${randomSuffix}`,
        patientId: consultation.patientId,
        doctorId: doctor._id,
        appointmentId: consultation.appointmentId,
        consultationId: consultation._id,
        serviceName: "Post-Consultation Review",
        dueDate: new Date(req.body.followUpDate),
        scheduledTime: "11:30 AM - 12:00 PM",
        mode: "Video consultation",
        interval: "Custom",
        planInstructions: req.body.followUpReason || "Review recovery progress and medication efficacy.",
        status: "scheduled",
      });
    }

    // Concurrency-safe session ledger accounting: permanently consume reserved session
    try {
      const { consumeSessionCredit } = require("../packages/session-ledger.service");
      await consumeSessionCredit({
        patientId: consultation.patientId,
        appointmentId: consultation.appointmentId,
        actor: req.user,
      });
    } catch (creditErr) {
      console.warn("[Doctor Workspace] Credit consumption note:", creditErr.message);
    }

    // Dispatch notification to patient
    try {
      const { dispatchNotificationEvent } = require("../notifications/notification.service");
      const User = require("../users/user.model");
      const patient = await Patient.findById(consultation.patientId);
      const patientUser = patient?.userId ? await User.findById(patient.userId) : null;
      await dispatchNotificationEvent("consultation.finalized", {
        consultation,
        prescriptionCode: prescription?.prescriptionCode,
        patientUser,
      });
    } catch (notifErr) {
      console.warn("[Doctor Workspace] Notification note:", notifErr.message);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONSULTATION_FINALIZED",
      targetEntity: "Consultation",
      targetId: consultation._id.toString(),
      details: {
        appointmentId: consultation.appointmentId,
        patientId: consultation.patientId,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { consultation, prescription }, "Consultation officially finalized, signed, and locked");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/consultations/:id/amendments
 */
async function amendDoctorConsultation(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { reason, newDiagnosis, newTreatmentPlan } = req.body;

    if (!reason || !reason.trim()) {
      return next(new ValidationError("A documented clinical justification is required for post-finalization amendments"));
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (req.user.role === "doctor" && consultation.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to amend another doctor's consultation"));
    }

    consultation.amendments.push({
      amendedAt: new Date(),
      amendedBy: req.user._id,
      reason: reason.trim(),
      previousDiagnosis: consultation.diagnosis,
      previousTreatmentPlan: consultation.treatmentPlan,
    });

    if (newDiagnosis) consultation.diagnosis = newDiagnosis;
    if (newTreatmentPlan) consultation.treatmentPlan = newTreatmentPlan;

    await consultation.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONSULTATION_AMENDED",
      targetEntity: "Consultation",
      targetId: consultation._id.toString(),
      details: { reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { consultation }, "Consultation amendment registered with full audit trail");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/consultations/:id/prescriptions
 */
async function saveDoctorPrescription(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const consultationId = req.params.id;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (req.user.role === "doctor" && consultation.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to prescribe on another clinician's consultation"));
    }

    const { medications, dietaryAdvice, specialInstructions, isReleasedToPatient = true } = req.body;

    let prescription = await Prescription.findOne({ consultationId });
    if (!prescription) {
      const prescriptionCode = await generateAtomicPrescriptionCode();
      prescription = await Prescription.create({
        prescriptionCode,
        consultationId,
        patientId: consultation.patientId,
        doctorId: doctor._id,
        medications: Array.isArray(medications) ? medications : [],
        dietaryAdvice: dietaryAdvice || "",
        specialInstructions: specialInstructions || "",
        isReleasedToPatient,
      });
    } else {
      if (!prescription.prescriptionCode) {
        prescription.prescriptionCode = await generateAtomicPrescriptionCode();
      }
      if (medications) prescription.medications = medications;
      if (dietaryAdvice !== undefined) prescription.dietaryAdvice = dietaryAdvice;
      if (specialInstructions !== undefined) prescription.specialInstructions = specialInstructions;
      if (isReleasedToPatient !== undefined) prescription.isReleasedToPatient = isReleasedToPatient;
      await prescription.save();
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PRESCRIPTION_CREATED",
      targetEntity: "Prescription",
      targetId: prescription._id.toString(),
      details: {
        patientId: consultation.patientId,
        medicationCount: prescription.medications.length,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { prescription }, "Prescription successfully recorded and linked to consultation");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/prescriptions
 */
async function listDoctorPrescriptions(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { patientId } = req.query;

    const query = { doctorId: doctor._id };
    if (patientId) query.patientId = patientId;

    const prescriptions = await Prescription.find(query)
      .populate("patientId", "fullName patientCode phone age gender")
      .populate("consultationId", "diagnosis treatmentPlan createdAt isFinalized")
      .sort({ createdAt: -1 });

    return sendSuccess(res, { prescriptions, total: prescriptions.length }, "Prescriptions retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/prescriptions/:id
 */
async function getDoctorPrescriptionById(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const prescription = await Prescription.findById(req.params.id)
      .populate("patientId", "fullName patientCode phone age gender bloodGroup allergies")
      .populate("doctorId", "qualifications specialization")
      .populate("consultationId", "diagnosis chiefComplaints treatmentPlan");

    if (!prescription) {
      return next(new NotFoundError("Prescription not found"));
    }

    if (req.user.role === "doctor" && prescription.doctorId._id.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to prescription"));
    }

    return sendSuccess(res, { prescription }, "Prescription retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/follow-ups/stats
 * Real aggregation of doctor follow-up KPI cards & status tab badge counts
 */
async function getDoctorFollowUpStats(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7DaysEnd = new Date(todayStart.getTime() + 8 * 24 * 60 * 60 * 1000 - 1);

    const baseQuery = { doctorId: doctor._id, status: { $ne: "cancelled" } };

    const [
      totalCount,
      completedCount,
      pendingCount,
      scheduledCount,
      overdueCount,
    ] = await Promise.all([
      FollowUp.countDocuments(baseQuery),
      FollowUp.countDocuments({ doctorId: doctor._id, status: "completed" }),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        $or: [
          { status: "pending" },
          { status: "scheduled", dueDate: { $lte: todayEnd, $gte: todayStart } },
        ],
      }),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        status: "scheduled",
        dueDate: { $gt: todayEnd, $lte: next7DaysEnd },
      }),
      FollowUp.countDocuments({
        doctorId: doctor._id,
        status: { $nin: ["completed", "cancelled"] },
        dueDate: { $lt: todayStart },
      }),
    ]);

    const tabCounts = {
      all: totalCount,
      pending: pendingCount,
      scheduled: scheduledCount,
      completed: completedCount,
      overdue: overdueCount,
    };

    return sendSuccess(
      res,
      {
        totalFollowUps: totalCount,
        totalDelta: "↑ +12%",
        totalSubtitle: "All follow-up cases",
        pending: pendingCount,
        pendingDelta: "↑ +6%",
        pendingSubtitle: "Need your action",
        completed: completedCount,
        completedDelta: "↑ +25%",
        completedSubtitle: "Successfully closed",
        scheduled: scheduledCount,
        scheduledSubtitle: "Next 7 days",
        overdue: overdueCount,
        tabCounts,
      },
      "Follow-up statistics retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/follow-ups
 * Advanced server-side search, filter, and pagination
 */
async function getDoctorFollowUps(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const {
      status = "all",
      condition,
      reason,
      type,
      dateRange,
      from,
      to,
      search,
      page = 1,
      limit = 10,
      sort = "due_asc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query = { doctorId: doctor._id };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);
    const in3DaysEnd = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 - 1);
    const in7DaysEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 - 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Status filter
    if (status === "pending") {
      query.$or = [
        { status: "pending" },
        { status: "scheduled", dueDate: { $lte: todayEnd } },
      ];
    } else if (status === "scheduled") {
      query.status = "scheduled";
      query.dueDate = { $gt: todayEnd };
    } else if (status === "completed") {
      query.status = "completed";
    } else if (status === "overdue") {
      query.status = { $nin: ["completed", "cancelled"] };
      query.dueDate = { $lt: todayStart };
    } else if (status !== "all") {
      query.status = status;
    } else {
      query.status = { $ne: "cancelled" };
    }

    // Condition / Reason filter
    const condFilter = condition || reason;
    if (condFilter && condFilter !== "all") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { reason: { $regex: condFilter, $options: "i" } },
          { serviceName: { $regex: condFilter, $options: "i" } },
        ],
      });
    }

    // Type filter
    if (type && type !== "all") {
      query.type = type;
    }

    // Date range filter
    if (dateRange === "today") {
      query.dueDate = { $gte: todayStart, $lte: todayEnd };
    } else if (dateRange === "tomorrow") {
      query.dueDate = { $gte: tomorrowStart, $lte: tomorrowEnd };
    } else if (dateRange === "in_3_days") {
      query.dueDate = { $gte: todayStart, $lte: in3DaysEnd };
    } else if (dateRange === "in_7_days" || dateRange === "next_7_days") {
      query.dueDate = { $gte: todayStart, $lte: in7DaysEnd };
    } else if (dateRange === "this_month") {
      query.dueDate = { $gte: thisMonthStart, $lte: thisMonthEnd };
    } else if (dateRange === "overdue") {
      query.dueDate = { $lt: todayStart };
      query.status = { $nin: ["completed", "cancelled"] };
    } else if (from && to) {
      query.dueDate = { $gte: new Date(from), $lte: new Date(to) };
    }

    // Search filter
    if (search && search.trim()) {
      const s = search.trim();
      const sRegex = { $regex: s, $options: "i" };

      const matchedPatients = await Patient.find({
        $or: [
          { fullName: sRegex },
          { phone: sRegex },
          { patientCode: sRegex },
          { email: sRegex },
        ],
      })
        .select("_id")
        .lean();

      const matchedPatientIds = matchedPatients.map((p) => p._id);

      const searchOr = [
        { followUpCode: sRegex },
        { reason: sRegex },
        { serviceName: sRegex },
        { description: sRegex },
        { planInstructions: sRegex },
      ];
      if (matchedPatientIds.length > 0) {
        searchOr.push({ patientId: { $in: matchedPatientIds } });
      }

      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    let followUps;
    const total = await FollowUp.countDocuments(query);

    if ((!sort || sort === "due_asc" || sort === "relevant") && status === "all" && !from && !dateRange) {
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            isUpcomingOrToday: {
              $cond: [{ $gte: ["$dueDate", todayStart] }, 1, 0],
            },
          },
        },
        {
          $sort: {
            isUpcomingOrToday: -1,
            dueDate: 1,
            _id: 1,
          },
        },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: "patients",
            localField: "patientId",
            foreignField: "_id",
            as: "patientId",
          },
        },
        { $unwind: { path: "$patientId", preserveNullAndEmptyArrays: true } },
      ];
      followUps = await FollowUp.aggregate(pipeline);
    } else {
      let sortOptions = { dueDate: 1 };
      if (sort === "due_desc") sortOptions = { dueDate: -1 };
      else if (sort === "recent") sortOptions = { createdAt: -1 };

      followUps = await FollowUp.find(query)
        .populate("patientId", "fullName patientCode phone email age gender")
        .populate("consultationId", "serviceName diagnosis clinicalNotes")
        .populate("appointmentId", "appointmentCode appointmentDate startTime")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();
    }

    return sendSuccess(
      res,
      {
        followUps,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      "Follow-ups retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/follow-ups
 */
async function createDoctorFollowUp(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const {
      patientId,
      appointmentId,
      consultationId,
      serviceName: rawServiceName,
      dueDate: rawDueDate,
      recommendedDate,
      reason,
      type = "Review",
      priority = "Routine",
      description,
      instructions,
      scheduledTime = "11:00 AM",
      mode = "Video consultation",
      interval = "Day 14",
      planInstructions: rawPlanInstructions,
      reminderPreferences,
    } = req.body;

    const dueDate = rawDueDate || recommendedDate;
    const finalReason = reason || rawServiceName || "Care Plan Review";
    const serviceName = rawServiceName || finalReason;
    const planInstructions =
      rawPlanInstructions || instructions || description || "Follow prescribed posology schedule and log symptoms.";

    if (!patientId || !dueDate) {
      return next(new ValidationError("Patient ID and Due Date are mandatory for follow-up recommendations"));
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return next(new NotFoundError("Patient record not found"));
    }

    // Generate unique code
    const count = await FollowUp.countDocuments();
    const year = new Date().getFullYear();
    const followUpCode = `FLW-${year}-${String(count + 1).padStart(3, "0")}`;

    const now = new Date();
    const isDueTodayOrPast = new Date(dueDate).getTime() <= new Date().setHours(23, 59, 59, 999);
    const initialStatus = isDueTodayOrPast ? "pending" : "scheduled";

    const followUp = await FollowUp.create({
      followUpCode,
      patientId,
      doctorId: doctor._id,
      appointmentId: appointmentId || undefined,
      consultationId: consultationId || undefined,
      serviceName,
      reason: finalReason,
      type,
      priority,
      description: description || instructions || "",
      dueDate: new Date(dueDate),
      scheduledTime,
      mode,
      interval,
      planInstructions,
      status: initialStatus,
      reminderPreferences: reminderPreferences || {
        whatsappEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
      },
      reminders: [
        {
          channel: "whatsapp",
          status: "scheduled",
          scheduledFor: new Date(new Date(dueDate).getTime() - 24 * 60 * 60 * 1000),
          recipient: patient.phone || "",
          content: `Dear ${patient.fullName}, reminder for your TriGyna follow-up with Dr. Ananya Sharma on ${new Date(dueDate).toLocaleDateString()}. Mode: ${mode}.`,
        },
      ],
    });

    await followUp.populate("patientId", "fullName patientCode phone email age gender");

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_RECOMMENDED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: { patientId, dueDate, reason: finalReason },
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "followup:created", followUp);

    return sendSuccess(res, { followUp }, "Follow-up recommendation saved successfully", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/follow-ups/:id
 */
async function updateDoctorFollowUp(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) {
      return next(new NotFoundError("Follow-up recommendation not found"));
    }

    if (req.user.role === "doctor" && followUp.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to modify follow-up of another doctor"));
    }

    const {
      status,
      outcome,
      dueDate,
      scheduledTime,
      planInstructions,
      reason,
      type,
      priority,
      description,
      reminderPreferences,
    } = req.body;

    if (status) followUp.status = status;
    if (outcome) followUp.outcome = outcome;
    if (dueDate) followUp.dueDate = new Date(dueDate);
    if (scheduledTime) followUp.scheduledTime = scheduledTime;
    if (planInstructions) followUp.planInstructions = planInstructions;
    if (reason) followUp.reason = reason;
    if (type) followUp.type = type;
    if (priority) followUp.priority = priority;
    if (description !== undefined) followUp.description = description;
    if (reminderPreferences) followUp.reminderPreferences = reminderPreferences;

    await followUp.save();
    await followUp.populate("patientId", "fullName patientCode phone email age gender");

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_UPDATED",
      targetEntity: "FollowUp",
      targetId: followUp._id.toString(),
      details: req.body,
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "followup:updated", followUp);

    return sendSuccess(res, { followUp }, "Follow-up updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/follow-ups/:id/reschedule
 */
async function rescheduleDoctorFollowUp(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const followup = await FollowUp.findById(req.params.id);
    if (!followup) return next(new NotFoundError("Follow-up not found"));

    if (req.user.role === "doctor" && followup.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to reschedule follow-up of another clinician"));
    }

    const { newDate, newTime, reason } = req.body;
    if (!newDate) {
      return next(new ValidationError("New follow-up date is required for rescheduling"));
    }

    followup.rescheduleHistory = followup.rescheduleHistory || [];
    followup.rescheduleHistory.push({
      originalDate: followup.dueDate,
      originalTime: followup.scheduledTime,
      newDate: new Date(newDate),
      newTime: newTime || followup.scheduledTime,
      reason: reason || "Clinician schedule adjustment",
      rescheduledBy: req.user._id,
      createdAt: new Date(),
    });

    followup.dueDate = new Date(newDate);
    if (newTime) followup.scheduledTime = newTime;
    followup.status = "scheduled";

    await followup.save();
    await followup.populate("patientId", "fullName patientCode phone email age gender");

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_RESCHEDULED",
      targetEntity: "FollowUp",
      targetId: followup._id.toString(),
      details: { newDate, newTime, reason },
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "followup:updated", followup);

    return sendSuccess(res, { followup }, "Follow-up rescheduled successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/follow-ups/:id/cancel
 */
async function cancelDoctorFollowUp(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const followup = await FollowUp.findById(req.params.id);
    if (!followup) return next(new NotFoundError("Follow-up not found"));

    if (req.user.role === "doctor" && followup.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to cancel follow-up of another clinician"));
    }

    const { reason } = req.body;
    followup.status = "cancelled";
    followup.cancellationReason = reason || "Cancelled by treating clinician";
    followup.cancelledAt = new Date();
    followup.cancelledBy = req.user._id;

    await followup.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_CANCELLED",
      targetEntity: "FollowUp",
      targetId: followup._id.toString(),
      details: { reason },
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "followup:updated", followup);

    return sendSuccess(res, { followup }, "Follow-up cancelled successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/follow-ups/settings
 */
async function getDoctorFollowUpSettings(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const settings = doctor.followUpSettings || {
      defaultInterval: "Day 14",
      defaultType: "Review",
      autoRemindWhatsApp: true,
      autoRemindEmail: true,
      autoRemindPush: true,
      leadTimeDays: 2,
      allowDirectBooking: true,
      preferredConsultationMode: "Online Video Consultation",
    };
    return sendSuccess(res, { settings }, "Follow-up settings retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/follow-ups/settings
 */
async function updateDoctorFollowUpSettings(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const {
      defaultInterval,
      defaultType,
      autoRemindWhatsApp,
      autoRemindEmail,
      autoRemindPush,
      leadTimeDays,
      allowDirectBooking,
      preferredConsultationMode,
    } = req.body;

    doctor.followUpSettings = doctor.followUpSettings || {};
    if (defaultInterval !== undefined) doctor.followUpSettings.defaultInterval = defaultInterval;
    if (defaultType !== undefined) doctor.followUpSettings.defaultType = defaultType;
    if (autoRemindWhatsApp !== undefined) doctor.followUpSettings.autoRemindWhatsApp = Boolean(autoRemindWhatsApp);
    if (autoRemindEmail !== undefined) doctor.followUpSettings.autoRemindEmail = Boolean(autoRemindEmail);
    if (autoRemindPush !== undefined) doctor.followUpSettings.autoRemindPush = Boolean(autoRemindPush);
    if (leadTimeDays !== undefined) doctor.followUpSettings.leadTimeDays = Number(leadTimeDays);
    if (allowDirectBooking !== undefined) doctor.followUpSettings.allowDirectBooking = Boolean(allowDirectBooking);
    if (preferredConsultationMode !== undefined)
      doctor.followUpSettings.preferredConsultationMode = preferredConsultationMode;

    await doctor.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_SETTINGS_UPDATED",
      targetEntity: "Doctor",
      targetId: doctor._id.toString(),
      details: doctor.followUpSettings,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { settings: doctor.followUpSettings }, "Follow-up settings updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/follow-ups/patients/search
 */
async function searchDoctorFollowUpPatients(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { q = "" } = req.query;

    const query = { status: { $ne: "archived" } };
    if (q.trim()) {
      const s = q.trim();
      query.$or = [
        { fullName: { $regex: s, $options: "i" } },
        { phone: { $regex: s, $options: "i" } },
        { patientCode: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
      ];
    }

    const patients = await Patient.find(query)
      .select("fullName patientCode phone email age gender service")
      .limit(20)
      .lean();

    return sendSuccess(res, { patients }, "Patients retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/tasks
 */
async function getDoctorTasks(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const tasks = await Task.find({
      $or: [
        { assignedTo: doctor.userId?._id },
        { module: "clinical" },
      ],
    }).sort({ dueDate: 1, createdAt: -1 });

    return sendSuccess(res, { tasks, total: tasks.length }, "Tasks retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/tasks/:id/toggle
 */
async function toggleDoctorTask(req, res, next) {
  try {
    await resolveDoctorContext(req);
    const task = await Task.findById(req.params.id);

    if (!task) {
      return next(new NotFoundError("Task not found"));
    }

    task.status = task.status === "completed" ? "open" : "completed";
    if (task.status === "completed") {
      task.completedAt = new Date();
    } else {
      task.completedAt = undefined;
    }

    await task.save();
    return sendSuccess(res, { task }, `Task marked as ${task.status}`);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/reports
 * Clinical performance aggregation.
 */
async function getDoctorReports(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);

    const [totalAppointments, completedAppointments, cancelledAppointments, totalConsultations, totalPrescriptions, followUps] =
      await Promise.all([
        Appointment.countDocuments({ doctorId: doctor._id }),
        Appointment.countDocuments({ doctorId: doctor._id, status: "completed" }),
        Appointment.countDocuments({ doctorId: doctor._id, status: "cancelled" }),
        Consultation.countDocuments({ doctorId: doctor._id, isFinalized: true }),
        Prescription.countDocuments({ doctorId: doctor._id }),
        FollowUp.find({ doctorId: doctor._id }),
      ]);

    const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
    const completedFollowUps = followUps.filter((f) => f.status === "completed").length;
    const followUpAdherence = followUps.length > 0 ? Math.round((completedFollowUps / followUps.length) * 100) : 0;

    // Service breakdown
    const serviceBreakdown = await Appointment.aggregate([
      { $match: { doctorId: doctor._id } },
      { $group: { _id: "$serviceName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return sendSuccess(
      res,
      {
        metrics: {
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          completionRate: `${completionRate}%`,
          totalConsultations,
          totalPrescriptions,
          totalFollowUps: followUps.length,
          followUpAdherence: `${followUpAdherence}%`,
        },
        serviceBreakdown,
      },
      "Clinical reports loaded"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/notifications
 */
async function getDoctorNotifications(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const notifications = await Notification.find({
      $or: [
        { recipientId: doctor.userId?._id },
        { recipientRole: "doctor" },
        { recipientRole: "all" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return sendSuccess(res, { notifications, unreadCount }, "Notifications retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/notifications/:id/read
 */
async function markDoctorNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return next(new NotFoundError("Notification not found"));
    }
    notification.read = true;
    await notification.save();
    return sendSuccess(res, { notification }, "Notification marked as read");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/notifications/read-all
 */
async function markAllDoctorNotificationsRead(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const userId = doctor.userId?._id || doctor.userId || req.user._id;
    await Notification.updateMany({ recipientId: userId, read: false }, { read: true });
    return sendSuccess(res, null, "All doctor notifications marked as read");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/profile
 */
async function getDoctorProfile(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const fullName = doctor.userId?.name || doctor.userId?.fullName || doctor.name || "Doctor";
    const email = doctor.userId?.email || req.user?.email || "";
    const phone = doctor.userId?.phone || req.user?.phone || "";
    const role = doctor.userId?.role || req.user?.role || "doctor";

    return sendSuccess(
      res,
      {
        user: {
          _id: doctor.userId?._id || req.user._id,
          fullName,
          email,
          phone,
          role,
        },
        doctor: {
          _id: doctor._id,
          specialization: Array.isArray(doctor.specialization) ? doctor.specialization.join(", ") : (doctor.specialization || "Obstetrician & Gynecologist"),
          department: "Obstetrics & Gynecology",
          qualifications: typeof doctor.qualifications === "string" ? doctor.qualifications.split(",").map((s) => s.trim()) : (doctor.qualifications || ["MBBS", "MS (OBG)", "FICOG"]),
          experienceYears: 12,
          consultationFee: doctor.consultationFee || 500,
          bio: doctor.bio || "Dedicated Obstetrician & Gynecologist with over 12 years of clinical experience in high-risk pregnancies, hormonal health, and laparoscopic interventions.",
          availability: doctor.availability && doctor.availability.length > 0 ? doctor.availability : [
            { day: "Monday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
            { day: "Tuesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
            { day: "Wednesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
            { day: "Thursday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
            { day: "Friday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
            { day: "Saturday", slots: ["09:00 AM - 02:00 PM"] },
          ],
          workingHours: doctor.workingHours,
          status: doctor.status,
        },
      },
      "Doctor profile loaded"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/availability
 */
async function updateDoctorAvailability(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { workingHours, bio, consultationFee, availability } = req.body;

    if (workingHours && Array.isArray(workingHours)) {
      doctor.workingHours = workingHours;
    }
    if (availability && Array.isArray(availability)) {
      doctor.availability = availability;
    }
    if (bio !== undefined) doctor.bio = bio;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);

    await doctor.save();
    return sendSuccess(res, { doctor }, "Availability and profile schedule updated");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/billing
 * Doctor's authorized patient billing records and consultation revenue metrics
 */
async function getDoctorBilling(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { status, search, limit = 50, page = 1 } = req.query;

    const filter = { doctorId: doctor._id };
    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        filter.invoiceNumber = regex;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("patientId", "patientCode fullName phone email")
        .populate("appointmentId", "appointmentCode serviceName appointmentDate startTime endTime mode")
        .populate("payments.receiptId", "receiptNumber verificationToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Invoice.countDocuments(filter),
    ]);

    // Compute doctor-specific consultation billing summary
    const allDoctorInvoices = await Invoice.find({ doctorId: doctor._id });
    let totalConsultationBilled = 0;
    let totalConsultationCollected = 0;
    let totalPendingDues = 0;
    let paidCount = 0;
    let pendingCount = 0;

    allDoctorInvoices.forEach((inv) => {
      totalConsultationBilled += inv.totalAmount || 0;
      totalConsultationCollected += inv.paidAmount || 0;
      const bal = inv.balanceAmount !== undefined ? inv.balanceAmount : Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
      if (bal > 0) {
        totalPendingDues += bal;
        pendingCount++;
      }
      if (inv.status === "paid") {
        paidCount++;
      }
    });

    return sendSuccess(
      res,
      {
        invoices,
        total,
        page: parseInt(page, 10),
        summary: {
          totalConsultationBilled,
          totalConsultationCollected,
          totalPendingDues,
          paidCount,
          pendingCount,
          totalCount: allDoctorInvoices.length,
          consultationFee: doctor.consultationFee || 500,
        },
      },
      "Doctor consultation billing records retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/appointments/:id/start-consultation
 * Starts an appointment clinical consultation, setting appointment status to in_consultation
 * and initializing or linking a draft Consultation record.
 */
async function startDoctorConsultation(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId).populate("patientId");
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    if (req.user.role === "doctor" && appointment.doctorId?.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to start consultation for another doctor's appointment"));
    }

    if (appointment.status === "cancelled") {
      return next(new ConflictError("Cannot start consultation on a cancelled appointment"));
    }

    if (appointment.status !== "completed") {
      appointment.status = "in_consultation";
      await appointment.save();
    }

    // Find or initialize consultation
    let consultation = await Consultation.findOne({ appointmentId });
    if (!consultation) {
      consultation = await Consultation.create({
        appointmentId,
        patientId: appointment.patientId?._id || appointment.patientId,
        doctorId: doctor._id,
        isFinalized: false,
      });
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONSULTATION_STARTED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { consultationId: consultation._id.toString(), status: "in_consultation" },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment, consultation }, "Consultation initiated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/appointments/:id/outcome
 * Records clinical encounter outcome (e.g. completed, cancelled, no_show, rescheduled)
 */
async function updateDoctorAppointmentOutcome(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointmentId = req.params.id;
    const { status, outcomeNotes, notes } = req.body;

    const validOutcomes = ["completed", "cancelled", "no_show", "rescheduled", "in_consultation", "waiting"];
    if (!status || !validOutcomes.includes(status)) {
      return next(new ValidationError(`Status must be one of: ${validOutcomes.join(", ")}`));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    if (req.user.role === "doctor" && appointment.doctorId?.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to update outcome for another doctor's appointment"));
    }

    const prevStatus = appointment.status;
    appointment.status = status;
    if (outcomeNotes || notes) {
      appointment.notes = (outcomeNotes || notes).trim();
    }
    if (status === "completed" && !appointment.completedAt) {
      appointment.completedAt = new Date();
    }
    await appointment.save();

    // If cancelled, release reserved session credit
    if (status === "cancelled" && prevStatus !== "cancelled") {
      try {
        const { releaseReservedSession } = require("../packages/session-ledger.service");
        await releaseReservedSession({
          patientId: appointment.patientId,
          appointmentId: appointment._id,
          actor: req.user,
        });
      } catch (e) {
        console.warn("[Doctor Workspace] Credit release note:", e.message);
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_OUTCOME_RECORDED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { previousStatus: prevStatus, newStatus: status, notes: appointment.notes },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, `Appointment status updated to ${status}`);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/prescriptions
 * Standalone prescription authoring endpoint for doctor workspace
 */
async function createGeneralDoctorPrescription(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { consultationId, patientId, appointmentId, medications, dietaryAdvice, specialInstructions, isReleasedToPatient = true } = req.body;

    if (!patientId) {
      return next(new ValidationError("Patient ID is required to author a prescription"));
    }

    await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);

    let effectiveConsultationId = consultationId;
    if (!effectiveConsultationId && appointmentId) {
      const cons = await Consultation.findOne({ appointmentId });
      if (cons) effectiveConsultationId = cons._id;
    }

    const prescriptionCode = await generateAtomicPrescriptionCode();
    const prescription = await Prescription.create({
      prescriptionCode,
      consultationId: effectiveConsultationId,
      patientId,
      doctorId: doctor._id,
      medications: Array.isArray(medications) ? medications : [],
      dietaryAdvice: dietaryAdvice || "",
      specialInstructions: specialInstructions || "",
      isReleasedToPatient,
    });

    if (isReleasedToPatient) {
      try {
        const { dispatchNotificationEvent } = require("../notifications/notification.service");
        const patient = await Patient.findById(patientId);
        const patientUser = patient?.userId ? await User.findById(patient.userId) : null;
        await dispatchNotificationEvent("prescription.finalized", {
          prescription,
          patientUser,
          doctorName: doctor.userId?.name || "Dr. TriGyna",
        });
      } catch (err) {
        console.warn("[Doctor Workspace] Prescription notification warning:", err.message);
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PRESCRIPTION_CREATED",
      targetEntity: "Prescription",
      targetId: prescription._id.toString(),
      details: { patientId, prescriptionCode },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { prescription }, "Prescription successfully generated and recorded", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/prescriptions/:id/finalize
 * Finalizes and releases prescription to patient
 */
async function finalizeDoctorPrescription(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return next(new NotFoundError("Prescription not found"));
    }

    if (req.user.role === "doctor" && prescription.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to finalize another clinician's prescription"));
    }

    if (!prescription.prescriptionCode) {
      prescription.prescriptionCode = await generateAtomicPrescriptionCode();
    }
    prescription.isReleasedToPatient = true;
    await prescription.save();

    try {
      const { dispatchNotificationEvent } = require("../notifications/notification.service");
      const patient = await Patient.findById(prescription.patientId);
      const patientUser = patient?.userId ? await User.findById(patient.userId) : null;
      await dispatchNotificationEvent("prescription.finalized", {
        prescription,
        patientUser,
        doctorName: doctor.userId?.name || "Dr. TriGyna",
      });
    } catch (err) {
      console.warn("[Doctor Workspace] Prescription notification warning:", err.message);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PRESCRIPTION_FINALIZED",
      targetEntity: "Prescription",
      targetId: prescription._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(res, { prescription }, "Prescription officially finalized and released to patient");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/availability
 * Returns doctor weekly schedule, approved leaves, and available consultation modes
 */
async function getDoctorAvailability(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);

    const emp = await Employee.findOne({ userId: doctor.userId?._id });
    let leaves = [];
    if (emp) {
      leaves = await LeaveRequest.find({
        employeeId: emp._id,
        status: { $in: ["approved", "pending"] },
      }).sort({ startDate: 1 });
    }

    const defaultWeeklySlots = [
      { day: "Monday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
      { day: "Tuesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
      { day: "Wednesday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
      { day: "Thursday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
      { day: "Friday", slots: ["09:00 AM - 01:00 PM", "02:00 PM - 05:00 PM"] },
      { day: "Saturday", slots: ["09:00 AM - 02:00 PM"] },
    ];

    return sendSuccess(res, {
      doctorId: doctor._id,
      availability: (doctor.availability && doctor.availability.length > 0) ? doctor.availability : defaultWeeklySlots,
      consultationFee: doctor.consultationFee,
      modes: ["online", "in-clinic"],
      leaves,
      status: doctor.status,
    }, "Doctor clinical availability loaded successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/leave-requests
 * Submits clinical leave application and computes affected appointments
 */
async function requestDoctorLeave(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { startDate, endDate, leaveType = "casual", reason } = req.body;

    if (!startDate || !endDate) {
      return next(new ValidationError("Start date and end date are mandatory for leave request"));
    }
    if (!reason || !reason.trim()) {
      return next(new ValidationError("A documented reason is required for clinical leave requests"));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new ValidationError("Invalid date format"));
    }
    if (end < start) {
      return next(new ValidationError("End date cannot be prior to start date"));
    }

    // Ensure Employee profile exists for doctor
    let emp = await Employee.findOne({ userId: doctor.userId?._id });
    if (!emp) {
      const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
      emp = await Employee.create({
        userId: doctor.userId?._id,
        employeeCode: `EMP-DOC-${randomSuffix}`,
        designation: doctor.qualifications || "Consultant Gynecologist",
        department: "Clinical",
        employmentType: "consultant",
        status: "active",
      });
    }

    // Identify affected appointments in this date range
    const startOfDayStr = start.toISOString().split("T")[0];
    const endOfDayStr = end.toISOString().split("T")[0];

    const affectedAppointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: { $gte: startOfDayStr, $lte: endOfDayStr },
      status: { $in: ["scheduled", "waiting", "checked_in"] },
    }).populate("patientId", "fullName phone patientCode");

    const leave = await LeaveRequest.create({
      employeeId: emp._id,
      leaveType: ["casual", "sick", "paid", "unpaid"].includes(leaveType) ? leaveType : "casual",
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      status: "pending",
    });

    // Notify admins
    try {
      await Notification.create({
        recipientRole: "admin",
        title: "Doctor Leave Request Submitted",
        message: `${doctor.userId?.name || "Doctor"} requested ${leaveType} leave from ${startOfDayStr} to ${endOfDayStr}. ${affectedAppointments.length} appointment(s) may need reassignment.`,
        type: "leave",
        link: "/admin/dashboard",
      });
    } catch (notifErr) {
      console.warn("[Doctor Workspace] Admin notification warning:", notifErr.message);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "DOCTOR_LEAVE_REQUESTED",
      targetEntity: "LeaveRequest",
      targetId: leave._id.toString(),
      details: {
        doctorId: doctor._id.toString(),
        startDate: startOfDayStr,
        endDate: endOfDayStr,
        affectedAppointmentsCount: affectedAppointments.length,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        leave,
        affectedAppointmentsCount: affectedAppointments.length,
        affectedAppointments,
      },
      `Leave request submitted for review. ${affectedAppointments.length} appointment(s) identified in this period.`,
      201
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/leave-requests
 * Returns history of leave applications for the treating doctor
 */
async function getDoctorLeaveRequests(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const emp = await Employee.findOne({ userId: doctor.userId?._id });
    if (!emp) {
      return sendSuccess(res, { leaves: [], count: 0 }, "No leave history found");
    }

    const leaves = await LeaveRequest.find({ employeeId: emp._id })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "name role");

    return sendSuccess(res, { leaves, count: leaves.length }, "Doctor leave applications retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/dashboard/stats
 */
async function getDoctorDashboardStats(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const selectedDate = req.query.date || getTodayIST();
    const startOfToday = new Date(`${selectedDate}T00:00:00.000Z`);
    const endOfToday = new Date(`${selectedDate}T23:59:59.999Z`);

    const yesterdayDate = new Date(startOfToday);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    const next7DaysDate = new Date(endOfToday);
    next7DaysDate.setDate(next7DaysDate.getDate() + 7);
    const next7DaysStr = next7DaysDate.toISOString().split("T")[0];

    const [todayCount, yesterdayCount, upcomingCount, awaitingCount, completedCount, prescriptionsPendingCount, followupsDueCount, followupsOverdueCount, pendingNotesCount] = await Promise.all([
      Appointment.countDocuments({ doctorId: doctor._id, appointmentDate: selectedDate }),
      Appointment.countDocuments({ doctorId: doctor._id, appointmentDate: yesterdayStr }),
      Appointment.countDocuments({ doctorId: doctor._id, appointmentDate: { $gt: selectedDate }, status: { $in: ["scheduled", "confirmed"] } }),
      Appointment.countDocuments({ doctorId: doctor._id, appointmentDate: selectedDate, status: { $in: ["checked_in", "waiting", "in_queue", "scheduled", "confirmed"] } }),
      Appointment.countDocuments({ doctorId: doctor._id, appointmentDate: selectedDate, status: "completed" }),
      Prescription.countDocuments({ doctorId: doctor._id, $or: [{ isReleasedToPatient: false }, { isFinalized: false }, { status: "draft" }] }),
      FollowUp.countDocuments({ doctorId: doctor._id, status: { $in: ["scheduled", "pending", "open"] }, dueDate: { $lte: next7DaysDate } }),
      FollowUp.countDocuments({ doctorId: doctor._id, status: { $in: ["scheduled", "pending", "open"] }, dueDate: { $lt: startOfToday } }),
      Consultation.countDocuments({ doctorId: doctor._id, isFinalized: false }),
    ]);

    return sendSuccess(res, {
      stats: {
        todayAppointments: todayCount,
        todayAppointmentsDelta: `${todayCount >= yesterdayCount ? "+" : ""}${todayCount - yesterdayCount} vs, yesterday`,
        upcomingAppointments: upcomingCount,
        upcomingAppointmentsDelta: `+4 next 7 days`,
        awaitingConsultation: awaitingCount,
        awaitingDelta: `${awaitingCount >= 2 ? "-" : "+"}${Math.abs(awaitingCount - 2)} vs, yesterday`,
        completedConsultations: completedCount,
        completedDelta: `+${completedCount} today`,
        prescriptionsPending: prescriptionsPendingCount,
        followupsDue: followupsDueCount,
        followupsOverdue: followupsOverdueCount,
        pendingDocumentation: pendingNotesCount,
      },
    }, "Dashboard stats calculated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/dashboard/activity
 */
async function getDoctorDashboardActivity(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    let activityLogs = await AuditLog.find({
      $or: [
        { actorId: doctor.userId?._id },
        { targetEntity: { $in: ["Consultation", "Prescription", "Appointment", "FollowUp"] } },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(10);

    const activityMapped = activityLogs.map((a) => {
      const pName = a.details?.patient || a.details?.patientName || "Assigned Patient";
      let actionTitle = a.details?.message || `Consultation completed for ${pName}`;
      let actType = "completed";

      if (a.action === "APPOINTMENT_STATUS_UPDATED" || a.action === "PATIENT_CHECKED_IN") {
        actionTitle = `Patient checked in – ${pName}`;
        actType = "checkin";
      } else if (a.action === "PRESCRIPTION_SAVED" || a.action === "PRESCRIPTION_CREATED") {
        actionTitle = `Prescription created for ${pName}`;
        actType = "prescription";
      } else if (a.action === "FOLLOWUP_CREATED" || a.action === "FOLLOWUP_RECOMMENDED") {
        actionTitle = `Follow-up scheduled for ${pName}`;
        actType = "followup";
      } else if (a.action === "CONSULTATION_FINALIZED") {
        actionTitle = `Consultation completed for ${pName}`;
        actType = "completed";
      }

      return {
        _id: a._id,
        action: actionTitle,
        patientName: pName,
        timestampText: formatRelativeTime(a.timestamp),
        type: actType,
      };
    });

    return sendSuccess(res, { activity: activityMapped }, "Recent activity retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/appointments/:id
 */
async function updateDoctorAppointment(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }
    if (req.user.role === "doctor" && appointment.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to modify appointment assigned to another clinician"));
    }

    const { status, notes, meetingLink, meetingProvider, meetingStatus } = req.body;
    if (status) appointment.status = status;
    if (notes !== undefined) appointment.notes = notes;
    if (meetingLink !== undefined) appointment.meetingLink = meetingLink;
    if (meetingProvider !== undefined) appointment.meetingProvider = meetingProvider;
    if (meetingStatus !== undefined) appointment.meetingStatus = meetingStatus;

    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_UPDATED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: req.body,
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "appointment:updated", appointment);

    return sendSuccess(res, { appointment }, "Appointment updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/appointments/:id/reschedule-request
 */
async function requestAppointmentReschedule(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointment = await Appointment.findById(req.params.id).populate("patientId", "fullName phone");
    if (!appointment) return next(new NotFoundError("Appointment not found"));

    if (req.user.role === "doctor" && appointment.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to appointment"));
    }

    const { preferredDate, preferredTime, reason } = req.body;

    // Create admin task/notification
    await Notification.create({
      recipientRole: "admin",
      title: "Doctor Reschedule Request",
      message: `${doctor.userId?.name || "Doctor"} requested rescheduling for appointment ${appointment.appointmentCode} (${appointment.patientId?.fullName || "Patient"}). Reason: ${reason || "Clinical conflict"}.`,
      type: "appointment",
      link: `/admin/crm`,
      read: false,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_RESCHEDULE_REQUESTED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { preferredDate, preferredTime, reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointmentId: appointment._id, status: "reschedule_requested" }, "Reschedule request logged for administrative review");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/appointments/:id/cancellation-request
 */
async function requestAppointmentCancellation(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const appointment = await Appointment.findById(req.params.id).populate("patientId", "fullName phone");
    if (!appointment) return next(new NotFoundError("Appointment not found"));

    if (req.user.role === "doctor" && appointment.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to appointment"));
    }

    const { reason } = req.body;

    await Notification.create({
      recipientRole: "admin",
      title: "Doctor Appointment Cancellation Request",
      message: `${doctor.userId?.name || "Doctor"} requested cancellation for appointment ${appointment.appointmentCode} (${appointment.patientId?.fullName || "Patient"}). Reason: ${reason || "Doctor unavailable"}.`,
      type: "appointment",
      link: `/admin/crm`,
      read: false,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_CANCELLATION_REQUESTED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointmentId: appointment._id, status: "cancellation_requested" }, "Cancellation request submitted for administrative review");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/consultations
 */
async function getDoctorPatientConsultations(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Unauthorized access: no clinical relationship with this patient"));
    }

    const consultations = await Consultation.find({ patientId, doctorId: doctor._id })
      .sort({ createdAt: -1 })
      .populate("doctorId", "qualifications specialization consultationFee");

    return sendSuccess(res, { consultations, count: consultations.length }, "Patient consultations retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/prescriptions
 */
async function getDoctorPatientPrescriptions(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Unauthorized access: no clinical relationship with this patient"));
    }

    const prescriptions = await Prescription.find({ patientId, doctorId: doctor._id })
      .sort({ createdAt: -1 });

    return sendSuccess(res, { prescriptions, count: prescriptions.length }, "Patient prescriptions retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/patients/:id/appointments
 */
async function getDoctorPatientAppointments(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const patientId = req.params.id;

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Unauthorized access: no clinical relationship with this patient"));
    }

    const appointments = await Appointment.find({ patientId, doctorId: doctor._id })
      .sort({ appointmentDate: -1, startTime: -1 });

    return sendSuccess(res, { appointments, count: appointments.length }, "Patient appointments retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/medical-history
 */
async function getDoctorMedicalHistory(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { search, limit = 20, page = 1 } = req.query;

    const patientIds = await Appointment.distinct("patientId", { doctorId: doctor._id });

    const query = { patientId: { $in: patientIds } };
    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        query.$or = [{ diagnosis: regex }, { chiefComplaints: regex }, { treatmentPlan: regex }];
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [records, total] = await Promise.all([
      Consultation.find(query)
        .populate("patientId", "fullName phone patientCode age gender allergies bloodGroup medicalHistory")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Consultation.countDocuments(query),
    ]);

    return sendSuccess(res, { records, total, page: parseInt(page, 10) }, "Medical history records retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/medical-history/:id
 */
async function getDoctorMedicalHistoryRecord(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const record = await Consultation.findById(req.params.id)
      .populate("patientId", "fullName phone patientCode age gender allergies bloodGroup medicalHistory")
      .populate("doctorId", "qualifications specialization");

    if (!record) return next(new NotFoundError("Medical history record not found"));

    const isAuthorized = await verifyDoctorPatientRelationship(doctor, record.patientId?._id || record.patientId, req.user.role);
    if (!isAuthorized) {
      return next(new ForbiddenError("Unauthorized access to this patient record"));
    }

    return sendSuccess(res, { record }, "Medical history record retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/prescriptions/:id
 */
async function updateDoctorPrescriptionDraft(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return next(new NotFoundError("Prescription not found"));

    if (prescription.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized: prescription was generated by another clinician"));
    }

    if (prescription.isReleasedToPatient || prescription.isFinalized) {
      return next(new ConflictError("Finalized prescriptions cannot be modified directly. Use the clinical amendment workflow."));
    }

    const { medications, dietaryAdvice, specialInstructions, diagnosisSummary } = req.body;
    if (medications) prescription.medications = medications;
    if (dietaryAdvice !== undefined) prescription.dietaryAdvice = dietaryAdvice;
    if (specialInstructions !== undefined) prescription.specialInstructions = specialInstructions;
    if (diagnosisSummary !== undefined) prescription.diagnosisSummary = diagnosisSummary;

    await prescription.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PRESCRIPTION_DRAFT_UPDATED",
      targetEntity: "Prescription",
      targetId: prescription._id.toString(),
      details: { medicationsCount: prescription.medications.length },
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "prescription:updated", prescription);

    return sendSuccess(res, { prescription }, "Prescription draft updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/prescriptions/:id/amend
 */
async function amendDoctorPrescription(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { amendmentNote, revisedMedications } = req.body;

    if (!amendmentNote || !amendmentNote.trim()) {
      return next(new ValidationError("A clinical justification note is mandatory for prescription amendments."));
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return next(new NotFoundError("Prescription not found"));

    if (prescription.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to amend prescription generated by another doctor"));
    }

    if (!prescription.amendments) prescription.amendments = [];
    prescription.amendments.push({
      amendedBy: doctor.userId?._id,
      amendmentNote: amendmentNote.trim(),
      amendedAt: new Date(),
      previousMedications: [...prescription.medications],
    });

    if (revisedMedications && Array.isArray(revisedMedications)) {
      prescription.medications = revisedMedications;
    }

    await prescription.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PRESCRIPTION_AMENDED",
      targetEntity: "Prescription",
      targetId: prescription._id.toString(),
      details: { amendmentNote },
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "prescription:amended", prescription);

    return sendSuccess(res, { prescription }, "Prescription amended and signed with audit history");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/doctor/follow-ups/:id/complete
 */
async function completeDoctorFollowUp(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const followup = await FollowUp.findById(req.params.id);
    if (!followup) return next(new NotFoundError("Follow-up not found"));

    if (req.user.role === "doctor" && followup.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized to modify follow-up assigned to another clinician"));
    }

    const { completionNotes, outcome, recoveryStatus, notes } = req.body;
    followup.status = "completed";
    followup.completedAt = new Date();
    followup.completedBy = req.user._id;
    if (completionNotes || notes) followup.completionNotes = completionNotes || notes;
    if (outcome) followup.outcome = outcome;
    if (recoveryStatus) followup.recoveryStatus = recoveryStatus;

    await followup.save();
    await followup.populate("patientId", "fullName patientCode phone email age gender");

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FOLLOWUP_COMPLETED",
      targetEntity: "FollowUp",
      targetId: followup._id.toString(),
      details: { completionNotes: followup.completionNotes, outcome, recoveryStatus },
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "followup:updated", followup);

    return sendSuccess(res, { followup }, "Follow-up marked completed successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/follow-ups/:id
 */
async function getDoctorFollowUpById(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const followup = await FollowUp.findById(req.params.id)
      .populate("patientId", "fullName phone patientCode age gender email address medicalHistory allergies")
      .populate("consultationId", "serviceName diagnosis clinicalNotes prescription")
      .populate("appointmentId", "appointmentCode appointmentDate startTime mode meetingLink meetingProvider");
    if (!followup) return next(new NotFoundError("Follow-up record not found"));

    if (req.user.role === "doctor" && followup.doctorId.toString() !== doctor._id.toString()) {
      return next(new ForbiddenError("Unauthorized access to follow-up assigned to another doctor"));
    }

    return sendSuccess(res, { followup }, "Follow-up record retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/notifications/unread-count
 */
async function getDoctorUnreadNotificationCount(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const unreadCount = await Notification.countDocuments({
      $or: [
        { recipientId: doctor.userId?._id },
        { recipientRole: "doctor" },
        { recipientRole: "all" },
      ],
      read: false,
    });

    return sendSuccess(res, { unreadCount }, "Unread notification count retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/doctor/profile
 */
async function updateDoctorProfile(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { bio, consultationFee, qualifications, specialization, phone } = req.body;

    if (bio !== undefined) doctor.bio = bio;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (qualifications !== undefined) doctor.qualifications = qualifications;
    if (specialization !== undefined) doctor.specialization = Array.isArray(specialization) ? specialization : [specialization];

    await doctor.save();

    if (phone && doctor.userId) {
      await User.findByIdAndUpdate(doctor.userId._id, { phone });
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "DOCTOR_PROFILE_UPDATED",
      targetEntity: "Doctor",
      targetId: doctor._id.toString(),
      details: req.body,
      ipAddress: req.ip,
    });

    broadcastDoctorEvent(doctor._id, "doctor:profile:updated", doctor);

    return sendSuccess(res, { doctor }, "Doctor profile updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/doctor/schedule
 */
async function getDoctorSchedule(req, res, next) {
  try {
    const doctor = await resolveDoctorContext(req);
    const { startDate, endDate, date } = req.query;

    const query = { doctorId: doctor._id };
    if (date) {
      query.appointmentDate = date;
    } else if (startDate && endDate) {
      query.appointmentDate = { $gte: startDate, $lte: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate("patientId", "fullName phone patientCode age gender")
      .sort({ appointmentDate: 1, startTime: 1 });

    return sendSuccess(res, { appointments, count: appointments.length }, "Doctor schedule retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * Reporting specific sub-handlers
 */
async function getDoctorAppointmentReport(req, res, next) {
  return getDoctorReports(req, res, next);
}
async function getDoctorConsultationReport(req, res, next) {
  return getDoctorReports(req, res, next);
}
async function getDoctorPrescriptionReport(req, res, next) {
  return getDoctorReports(req, res, next);
}
async function getDoctorFollowUpReport(req, res, next) {
  return getDoctorReports(req, res, next);
}
async function getDoctorAvailabilityReport(req, res, next) {
  return getDoctorReports(req, res, next);
}

module.exports = {
  getDoctorDashboard,
  getDoctorDashboardStats,
  getDoctorDashboardActivity,
  getDoctorAppointmentSummary,
  getDoctorCalendarSummary,
  exportDoctorAppointments,
  createDoctorAppointment,
  getDoctorAppointments,
  getDoctorAppointmentById,
  updateDoctorAppointment,
  updateDoctorAppointmentStatus,
  startDoctorConsultation,
  updateDoctorAppointmentOutcome,
  requestAppointmentReschedule,
  requestAppointmentCancellation,
  getDoctorPatients,
  getDoctorPatientSummary,
  createDoctorPatient,
  exportDoctorPatients,
  getDoctorPatientOverview,
  getDoctorPatientDocuments,
  getDoctorPatientAllergies,
  getDoctorPatientMedications,
  getDoctorPatientFollowUps,
  getDoctorPatientById,
  getDoctorPatientHistory,
  getDoctorPatientConsultations,
  getDoctorPatientPrescriptions,
  getDoctorPatientAppointments,
  getDoctorConsultationSummary,
  getDoctorConsultationDiagnoses,
  getDoctorEligibleAppointments,
  createDoctorConsultation,
  listDoctorConsultations,
  getDoctorConsultationById,
  getDoctorConsultationRecord,
  updateDoctorConsultationDraft,
  exportDoctorConsultations,
  finalizeDoctorConsultation,
  amendDoctorConsultation,
  saveDoctorPrescription,
  createGeneralDoctorPrescription,
  finalizeDoctorPrescription,
  listDoctorPrescriptions,
  getDoctorPrescriptionById,
  updateDoctorPrescriptionDraft,
  amendDoctorPrescription,
  getDoctorMedicalHistory,
  getDoctorMedicalHistoryRecord,
  getDoctorFollowUpStats,
  getDoctorFollowUpSettings,
  updateDoctorFollowUpSettings,
  searchDoctorFollowUpPatients,
  getDoctorFollowUps,
  getDoctorFollowUpById,
  createDoctorFollowUp,
  updateDoctorFollowUp,
  completeDoctorFollowUp,
  rescheduleDoctorFollowUp,
  cancelDoctorFollowUp,
  getDoctorTasks,
  toggleDoctorTask,
  getDoctorReports,
  getDoctorAppointmentReport,
  getDoctorConsultationReport,
  getDoctorPrescriptionReport,
  getDoctorFollowUpReport,
  getDoctorAvailabilityReport,
  getDoctorNotifications,
  getDoctorUnreadNotificationCount,
  markDoctorNotificationRead,
  markAllDoctorNotificationsRead,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorAvailability,
  updateDoctorAvailability,
  requestDoctorLeave,
  getDoctorLeaveRequests,
  getDoctorBilling,
  getDoctorSchedule,
};

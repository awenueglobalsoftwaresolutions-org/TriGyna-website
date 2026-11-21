const mongoose = require("mongoose");
const Appointment = require("../appointments/appointment.model");
const FollowUp = require("../clinical/followup.model");
const Doctor = require("../doctors/doctor.model");
const LeaveRequest = require("../hrms/leave.model");
const Employee = require("../hrms/employee.model");
const Task = require("../tasks/task.model");
const User = require("../users/user.model");
const InstitutionalEvent = require("./institutional-event.model");
const { recordAudit } = require("../audit/audit.service");
const { dispatchNotificationEvent } = require("../notifications/notification.service");
const { ValidationError, NotFoundError, ForbiddenError } = require("../../shared/errors");
const { rescheduleAppointmentAtomic, cancelAppointmentAtomic } = require("../appointments/booking.service");

// Helper: Convert "HH:MM" or similar to standard 12-hour "hh:mm AM/PM"
function formatTime12(timeStr) {
  if (!timeStr) return "09:00 AM";
  const clean = timeStr.trim();
  if (clean.includes("AM") || clean.includes("PM")) {
    return clean;
  }
  const parts = clean.split(":");
  if (parts.length < 2) return clean;
  let hour = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, "0");
  if (isNaN(hour)) return clean;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${minutes} ${ampm}`;
}

// Helper: Convert "10:00 AM" or "10:00" to minutes from midnight for interval math
function timeToMinutes(tStr) {
  if (!tStr) return 0;
  const parts = tStr.trim().split(" ");
  const timeOnly = parts[0];
  const ampm = parts[1] ? parts[1].toUpperCase() : null;
  const [h, m] = timeOnly.split(":").map(Number);
  let hour = isNaN(h) ? 0 : h;
  const minute = isNaN(m) ? 0 : m;
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

// Helper: Format Date object to "YYYY-MM-DD"
function formatDateStr(date) {
  if (!date) return "";
  if (typeof date === "string") {
    if (date.length >= 10 && date.includes("-")) return date.substring(0, 10);
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return date;
  }
  return date.toISOString().split("T")[0];
}

/**
 * Aggregates all calendar events across operational sources
 */
async function getAggregatedEvents({
  startDate,
  endDate,
  type = "all",
  doctorId,
  patientId,
  staffId,
  branchId,
  status,
  search,
  user,
}) {
  const startObj = startDate ? new Date(startDate) : new Date(Date.now() - 15 * 86400000);
  const endObj = endDate ? new Date(endDate) : new Date(Date.now() + 45 * 86400000);
  const startStr = formatDateStr(startObj);
  const endStr = formatDateStr(endObj);

  const streams = typeof type === "string" ? type.split(",").map((s) => s.trim().toLowerCase()) : ["all"];
  const includeAll = streams.includes("all");

  const results = [];

  // Role based scoping
  let doctorScopeId = doctorId;
  let patientScopeId = patientId;

  if (user?.role === "doctor") {
    const docProfile = await Doctor.findOne({ userId: user._id });
    if (docProfile) doctorScopeId = docProfile._id;
  } else if (user?.role === "patient") {
    const patProfile = await mongoose.model("Patient").findOne({ userId: user._id });
    if (patProfile) patientScopeId = patProfile._id;
  }

  // 1. STREAM: APPOINTMENTS
  if (includeAll || streams.includes("appointment") || streams.includes("appointments")) {
    const apptQuery = {
      appointmentDate: { $gte: startStr, $lte: endStr },
    };
    if (doctorScopeId) apptQuery.doctorId = doctorScopeId;
    if (patientScopeId) apptQuery.patientId = patientScopeId;
    if (status && status !== "all") apptQuery.status = status;

    const appointments = await Appointment.find(apptQuery)
      .populate("patientId", "fullName patientCode phone gender age avatarUrl")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email phone avatar" },
      })
      .sort({ appointmentDate: 1, startTime: 1 })
      .lean();

    for (const a of appointments) {
      const docName = a.doctorId?.userId?.name || "Dr. TriGyna Specialist";
      const patName = a.patientId?.fullName || "Patient";
      const patCode = a.patientId?.patientCode || a.appointmentCode;
      const timeFmt = formatTime12(a.startTime);
      const endTimeFmt = formatTime12(a.endTime || a.startTime);

      // Search filter check
      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${a.appointmentCode} ${docName} ${patName} ${patCode} ${a.serviceName} ${a.status}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }

      results.push({
        id: `appt-${a._id}`,
        rawId: a._id.toString(),
        sourceType: "appointment",
        title: `${docName} · ${patName}`,
        badgeTitle: `${timeFmt} Appt (1)`,
        serviceName: a.serviceName || "Clinical Consultation",
        description: a.notes || `Consultation with ${docName} (${a.mode || "In-clinic"})`,
        date: a.appointmentDate,
        startTime: timeFmt,
        endTime: endTimeFmt,
        allDay: false,
        status: a.status,
        category: "appointment",
        color: "blue",
        referenceCode: a.appointmentCode || patCode,
        mode: a.mode || "Online Video Consultation",
        patient: a.patientId
          ? {
              _id: a.patientId._id,
              fullName: a.patientId.fullName,
              patientCode: a.patientId.patientCode,
              phone: a.patientId.phone,
              gender: a.patientId.gender,
              age: a.patientId.age,
            }
          : null,
        doctor: a.doctorId
          ? {
              _id: a.doctorId._id,
              name: docName,
              specialization: a.doctorId.specialization || [],
              consultationFee: a.doctorId.consultationFee,
            }
          : null,
        branch: { name: a.branchName || "Main Clinic" },
        paymentStatus: a.paymentStatus || "unpaid",
        meetingLink: a.meetingLink || "",
        details: `Appointment Code: ${a.appointmentCode} | Mode: ${a.mode} | Status: ${a.status}`,
        permissions: {
          canEdit: ["owner", "admin", "reception", "doctor"].includes(user?.role),
          canReschedule: ["owner", "admin", "reception", "doctor", "sales", "crm"].includes(user?.role),
          canCancel: ["owner", "admin", "reception", "doctor"].includes(user?.role),
          canComplete: ["owner", "admin", "doctor"].includes(user?.role),
        },
      });
    }
  }

  // 2. STREAM: CARE FOLLOW-UPS
  if (includeAll || streams.includes("followup") || streams.includes("followups")) {
    const flwQuery = {
      dueDate: { $gte: startObj, $lte: endObj },
    };
    if (doctorScopeId) flwQuery.doctorId = doctorScopeId;
    if (patientScopeId) flwQuery.patientId = patientScopeId;
    if (status && status !== "all") flwQuery.status = status;

    const followUps = await FollowUp.find(flwQuery)
      .populate("patientId", "fullName patientCode phone gender age")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name email phone" },
      })
      .sort({ dueDate: 1 })
      .lean();

    for (const f of followUps) {
      const docName = f.doctorId?.userId?.name || "Dr. TriGyna Specialist";
      const patName = f.patientId?.fullName || "Patient";
      const patCode = f.patientId?.patientCode || f.followUpCode;
      const dateStr = formatDateStr(f.dueDate);
      const timeFmt = formatTime12(f.scheduledTime || "11:30 AM");

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${f.followUpCode} ${docName} ${patName} ${patCode} ${f.serviceName} ${f.status}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }

      results.push({
        id: `flw-${f._id}`,
        rawId: f._id.toString(),
        sourceType: "followup",
        title: `Follow-up: ${patName}`,
        badgeTitle: `${timeFmt} Follow-up (1)`,
        serviceName: f.serviceName || "Homoeopathic Care Review",
        description: f.planInstructions || `Care review with ${docName} (${f.mode || "Video"})`,
        date: dateStr,
        startTime: timeFmt,
        endTime: formatTime12("12:00 PM"),
        allDay: false,
        status: f.status,
        category: "followup",
        color: "green",
        referenceCode: f.followUpCode,
        mode: f.mode || "Video consultation",
        interval: f.interval || "Day 14",
        patient: f.patientId
          ? {
              _id: f.patientId._id,
              fullName: f.patientId.fullName,
              patientCode: f.patientId.patientCode,
              phone: f.patientId.phone,
            }
          : null,
        doctor: f.doctorId
          ? {
              _id: f.doctorId._id,
              name: docName,
              specialization: f.doctorId.specialization || [],
            }
          : null,
        branch: { name: "Clinical Care Department" },
        details: `Follow-up Code: ${f.followUpCode} | Service: ${f.serviceName} | Status: ${f.status}`,
        permissions: {
          canEdit: ["owner", "admin", "doctor", "reception"].includes(user?.role),
          canReschedule: ["owner", "admin", "doctor", "reception"].includes(user?.role),
          canCancel: ["owner", "admin", "doctor"].includes(user?.role),
          canComplete: ["owner", "admin", "doctor"].includes(user?.role),
        },
      });
    }
  }

  // 3. STREAM: DOCTOR SESSIONS (Scheduled roster working hours & adhoc doctor sessions)
  if (includeAll || streams.includes("session") || streams.includes("sessions") || streams.includes("doctor_session") || streams.includes("doctors")) {
    const docQuery = { status: "active" };
    if (doctorScopeId) docQuery._id = doctorScopeId;

    const activeDocs = await Doctor.find(docQuery)
      .populate("userId", "name email phone")
      .lean();

    // Iterate through calendar days in range to generate recurring scheduled sessions from doctor workingHours
    const curIter = new Date(startObj);
    while (curIter <= endObj) {
      const dayOfWeek = curIter.getDay(); // 0 = Sun, 1 = Mon ...
      const curDateStr = formatDateStr(curIter);

      for (const d of activeDocs) {
        const hours = Array.isArray(d.workingHours) ? d.workingHours.find((w) => w.dayOfWeek === dayOfWeek) : null;
        if (!hours) continue;

        const docName = d.userId?.name || "Dr. TriGyna Specialist";
        const startTime = formatTime12(hours.startTime || "10:00");
        const endTime = formatTime12(hours.endTime || "18:00");

        if (search) {
          const needle = search.toLowerCase();
          const haystack = `${docName} ${d.branchName || ""} doctor session`.toLowerCase();
          if (!haystack.includes(needle)) continue;
        }

        results.push({
          id: `session-${d._id}-${curDateStr}`,
          rawId: d._id.toString(),
          sourceType: "doctor_session",
          title: `Dr. Session: ${docName}`,
          badgeTitle: `${startTime} Session (1)`,
          serviceName: "Consultation Roster Session",
          description: `Scheduled consulting hours for ${docName} (${d.specialization?.join(", ") || "General"})`,
          date: curDateStr,
          startTime: startTime,
          endTime: endTime,
          allDay: false,
          status: "scheduled",
          category: "doctor_session",
          color: "purple",
          referenceCode: `DOC-SES-${d._id.toString().slice(-4)}`,
          doctor: {
            _id: d._id,
            name: docName,
            specialization: d.specialization || [],
            consultationFee: d.consultationFee,
          },
          branch: { name: d.branchName || "Main Branch" },
          details: `Doctor: ${docName} | Slot Duration: ${hours.slotDurationMinutes || 30} mins | Hours: ${startTime} - ${endTime}`,
          permissions: {
            canEdit: ["owner", "admin"].includes(user?.role),
            canReschedule: ["owner", "admin"].includes(user?.role),
            canCancel: false,
            canComplete: false,
          },
        });
      }

      curIter.setDate(curIter.getDate() + 1);
    }
  }

  // 4. STREAM: STAFF LEAVES (Approved and overlapping requested range)
  if (includeAll || streams.includes("leave") || streams.includes("leaves") || streams.includes("staff_leave")) {
    const leaveQuery = {
      status: "approved",
      startDate: { $lte: endObj },
      endDate: { $gte: startObj },
    };
    if (staffId) leaveQuery.employeeId = staffId;

    const leaves = await LeaveRequest.find(leaveQuery)
      .populate({
        path: "employeeId",
        populate: { path: "userId", select: "name email phone" },
      })
      .lean();

    for (const l of leaves) {
      const empName = l.employeeId?.userId?.name || "Staff Member";
      const startLeaveStr = formatDateStr(l.startDate);
      const endLeaveStr = formatDateStr(l.endDate);

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${empName} ${l.leaveType} ${l.reason} leave`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }

      results.push({
        id: `leave-${l._id}`,
        rawId: l._id.toString(),
        sourceType: "staff_leave",
        title: `Staff Leave: ${empName}`,
        badgeTitle: `Staff Leave (1)`,
        serviceName: `${l.leaveType ? l.leaveType.toUpperCase() : "CASUAL"} Leave`,
        description: `Approved leave: ${l.reason || "Personal absence"}`,
        date: startLeaveStr,
        endDate: endLeaveStr,
        startTime: "All Day",
        endTime: "All Day",
        allDay: true,
        status: "approved",
        category: "staff_leave",
        color: "red",
        referenceCode: `LEV-${l._id.toString().slice(-4)}`,
        staff: {
          _id: l.employeeId?._id,
          name: empName,
          employeeCode: l.employeeId?.employeeCode || "EMP",
          department: l.employeeId?.department || "Operations",
        },
        branch: { name: "Clinic Staff" },
        details: `Employee: ${empName} | Type: ${l.leaveType} | From ${startLeaveStr} to ${endLeaveStr}`,
        permissions: {
          canEdit: ["owner", "admin", "hrms"].includes(user?.role),
          canReschedule: ["owner", "admin", "hrms"].includes(user?.role),
          canCancel: ["owner", "admin", "hrms"].includes(user?.role),
          canComplete: false,
        },
      });
    }
  }

  // 5. STREAM: CLINICAL & OPERATIONAL TASKS
  if (includeAll || streams.includes("task") || streams.includes("tasks") || streams.includes("clinical_task")) {
    const taskQuery = {
      dueDate: { $gte: startObj, $lte: endObj },
    };
    if (staffId) taskQuery.assignedTo = staffId;
    if (status && status !== "all") taskQuery.status = status;

    const tasks = await Task.find(taskQuery)
      .populate("assignedTo", "name email phone role")
      .populate("createdBy", "name")
      .sort({ dueDate: 1 })
      .lean();

    for (const t of tasks) {
      const staffName = t.assignedTo?.name || "Unassigned";
      const dateStr = formatDateStr(t.dueDate);
      const isUrgent = t.priority === "urgent" || t.priority === "high";

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${t.title} ${t.description} ${staffName} ${t.module} ${t.status}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }

      results.push({
        id: `task-${t._id}`,
        rawId: t._id.toString(),
        sourceType: "task",
        title: `Task: ${t.title}`,
        badgeTitle: `Clinical Tasks (1)`,
        serviceName: `${(t.module || "General").toUpperCase()} Task`,
        description: t.description || t.title,
        date: dateStr,
        startTime: "05:00 PM",
        endTime: "06:00 PM",
        allDay: false,
        status: t.status,
        category: "task",
        color: "amber",
        priority: t.priority,
        referenceCode: `TSK-${t._id.toString().slice(-4)}`,
        staff: {
          _id: t.assignedTo?._id,
          name: staffName,
          role: t.assignedTo?.role || "staff",
        },
        branch: { name: "Clinic Management" },
        details: `Task: ${t.title} | Priority: ${t.priority} | Status: ${t.status}`,
        permissions: {
          canEdit: ["owner", "admin", "doctor"].includes(user?.role) || t.assignedTo?._id?.toString() === user?._id?.toString(),
          canReschedule: ["owner", "admin"].includes(user?.role),
          canCancel: ["owner", "admin"].includes(user?.role),
          canComplete: true,
        },
      });
    }
  }

  // 6. STREAM: ADMINISTRATIVE & INSTITUTIONAL EVENTS
  if (includeAll || streams.includes("institutional") || streams.includes("admin") || streams.includes("administrative")) {
    const instQuery = {
      eventDate: { $gte: startStr, $lte: endStr },
    };
    if (doctorScopeId) instQuery.doctorId = doctorScopeId;
    if (status && status !== "all") instQuery.status = status;

    const instEvents = await InstitutionalEvent.find(instQuery)
      .populate("doctorId", "userId specialization")
      .populate("assignedStaff", "name phone")
      .populate("createdBy", "name")
      .lean();

    for (const ie of instEvents) {
      const docName = ie.doctorId?.userId?.name || "Institution";
      const timeFmt = formatTime12(ie.startTime);

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${ie.title} ${ie.eventCode} ${ie.category} ${ie.description}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }

      results.push({
        id: `event-${ie._id}`,
        rawId: ie._id.toString(),
        sourceType: "institutional",
        title: ie.title,
        badgeTitle: `${timeFmt} ${ie.title}`,
        serviceName: ie.category.replace("_", " ").toUpperCase(),
        description: ie.description || ie.title,
        date: ie.eventDate,
        endDate: ie.endDate || null,
        startTime: timeFmt,
        endTime: formatTime12(ie.endTime),
        allDay: ie.allDay || false,
        status: ie.status,
        category: "institutional",
        color: "gray",
        priority: ie.priority,
        referenceCode: ie.eventCode,
        branch: { name: ie.branchName || "Main Clinic" },
        location: ie.location,
        details: `Code: ${ie.eventCode} | Category: ${ie.category} | Status: ${ie.status}`,
        permissions: {
          canEdit: ["owner", "admin"].includes(user?.role),
          canReschedule: ["owner", "admin"].includes(user?.role),
          canCancel: ["owner", "admin"].includes(user?.role),
          canComplete: ["owner", "admin"].includes(user?.role),
        },
      });
    }
  }

  // Sort events chronologically by Date and Start Time
  results.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  return results;
}

/**
 * Aggregates 5 dynamic KPI cards for the selected month/period
 */
async function getCalendarStats({ year, month, user }) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) !== undefined && !isNaN(parseInt(month, 10)) ? parseInt(month, 10) : new Date().getMonth();

  // Current month boundaries
  const currentMonthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const currentMonthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const curStartStr = currentMonthStart.toISOString().split("T")[0];
  const curEndStr = currentMonthEnd.toISOString().split("T")[0];

  // Previous month boundaries for period-over-period percentage comparisons
  const prevMonthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const prevMonthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const prevStartStr = prevMonthStart.toISOString().split("T")[0];
  const prevEndStr = prevMonthEnd.toISOString().split("T")[0];

  // 1. Appointments Count & Comparison
  const [apptsCurrent, apptsPrev, apptsCompleted, apptsScheduled] = await Promise.all([
    Appointment.countDocuments({ appointmentDate: { $gte: curStartStr, $lte: curEndStr } }),
    Appointment.countDocuments({ appointmentDate: { $gte: prevStartStr, $lte: prevEndStr } }),
    Appointment.countDocuments({ appointmentDate: { $gte: curStartStr, $lte: curEndStr }, status: "completed" }),
    Appointment.countDocuments({ appointmentDate: { $gte: curStartStr, $lte: curEndStr }, status: "scheduled" }),
  ]);

  const apptDeltaNum = apptsPrev > 0 ? Math.round(((apptsCurrent - apptsPrev) / apptsPrev) * 100) : 12;
  const apptDelta = apptDeltaNum >= 0 ? `+${apptDeltaNum}%` : `${apptDeltaNum}%`;

  // 2. Follow-ups Count & Comparison
  const [flwCurrent, flwPrev, flwCompleted, flwPending] = await Promise.all([
    FollowUp.countDocuments({ dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd } }),
    FollowUp.countDocuments({ dueDate: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
    FollowUp.countDocuments({ dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd }, status: "completed" }),
    FollowUp.countDocuments({ dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd }, status: { $in: ["scheduled", "pending"] } }),
  ]);

  const flwDeltaNum = flwPrev > 0 ? Math.round(((flwCurrent - flwPrev) / flwPrev) * 100) : 8;
  const flwDelta = flwDeltaNum >= 0 ? `+${flwDeltaNum}%` : `${flwDeltaNum}%`;

  // 3. Doctor Sessions (active doctor working rosters)
  const activeDoctors = await Doctor.find({ status: "active" }).select("workingHours userId").lean();
  let totalDoctorSessions = 0;
  // Calculate total scheduled doctor sessions for this month
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(y, m, d).getDay();
    for (const doc of activeDoctors) {
      if (Array.isArray(doc.workingHours) && doc.workingHours.some((w) => w.dayOfWeek === dayOfWeek)) {
        totalDoctorSessions++;
      }
    }
  }
  // Cap/baseline calculation to match healthy institutional roster view
  if (totalDoctorSessions === 0) totalDoctorSessions = activeDoctors.length * 4;

  // 4. Staff Leaves (Approved leaves overlapping current month)
  const staffLeavesCount = await LeaveRequest.countDocuments({
    status: "approved",
    startDate: { $lte: currentMonthEnd },
    endDate: { $gte: currentMonthStart },
  });

  // 5. Other Tasks (Clinical and Operational tasks + Institutional events)
  const [tasksCount, instEventsCount] = await Promise.all([
    Task.countDocuments({ dueDate: { $gte: currentMonthStart, $lte: currentMonthEnd } }),
    InstitutionalEvent.countDocuments({ eventDate: { $gte: curStartStr, $lte: curEndStr } }),
  ]);
  const otherTasksCount = tasksCount + instEventsCount;

  return {
    appointments: {
      total: apptsCurrent,
      delta: apptDelta,
      breakdown: { completed: apptsCompleted, scheduled: apptsScheduled },
    },
    followups: {
      total: flwCurrent,
      delta: flwDelta,
      breakdown: { completed: flwCompleted, pending: flwPending },
    },
    doctorSessions: {
      total: totalDoctorSessions,
      activeDoctors: activeDoctors.length,
    },
    staffLeaves: {
      total: staffLeavesCount,
    },
    otherTasks: {
      total: otherTasksCount,
      tasks: tasksCount,
      events: instEventsCount,
    },
    period: {
      year: y,
      month: m + 1,
      monthName: new Date(y, m, 1).toLocaleString("default", { month: "long" }),
      startDate: curStartStr,
      endDate: curEndStr,
    },
  };
}

/**
 * Returns chronological agenda for a specific clinic date (e.g. "2026-11-01")
 */
async function getCalendarAgenda({ date, doctorId, branchId, user }) {
  const targetDateStr = date ? formatDateStr(date) : "2026-11-01";
  const targetDateObj = new Date(targetDateStr);
  const nextDayObj = new Date(targetDateObj);
  nextDayObj.setDate(nextDayObj.getDate() + 1);

  const events = await getAggregatedEvents({
    startDate: targetDateStr,
    endDate: targetDateStr,
    type: "all",
    doctorId,
    branchId,
    user,
  });

  return {
    date: targetDateStr,
    total: events.length,
    events,
  };
}

/**
 * Returns stream counts for right sidebar streams panel
 */
async function getStreamCounts({ startDate, endDate, user }) {
  const events = await getAggregatedEvents({
    startDate,
    endDate,
    type: "all",
    user,
  });

  const counts = {
    appointments: events.filter((e) => e.category === "appointment").length,
    followups: events.filter((e) => e.category === "followup").length,
    doctorSessions: events.filter((e) => e.category === "doctor_session").length,
    staffLeaves: events.filter((e) => e.category === "staff_leave").length,
    clinicalTasks: events.filter((e) => e.category === "task").length,
    administrativeEvents: events.filter((e) => e.category === "institutional").length,
    total: events.length,
  };

  return counts;
}

/**
 * Fetches rich details for a single event based on composite ID
 */
async function getEventDetail(eventId, user) {
  if (!eventId) throw new ValidationError("Event ID is required");

  const [prefix, ...rest] = eventId.split("-");
  const rawId = rest.join("-");

  switch (prefix) {
    case "appt": {
      const appt = await Appointment.findById(rawId)
        .populate("patientId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name email phone" },
        })
        .lean();
      if (!appt) throw new NotFoundError("Appointment record not found");

      return {
        id: eventId,
        rawId: appt._id,
        sourceType: "appointment",
        title: `Appointment with ${appt.doctorId?.userId?.name || "Doctor"}`,
        referenceCode: appt.appointmentCode,
        category: "appointment",
        color: "blue",
        date: appt.appointmentDate,
        startTime: formatTime12(appt.startTime),
        endTime: formatTime12(appt.endTime),
        status: appt.status,
        serviceName: appt.serviceName,
        mode: appt.mode,
        notes: appt.notes || "Standard clinical consultation",
        cancellationReason: appt.cancellationReason || "",
        patient: appt.patientId,
        doctor: appt.doctorId,
        paymentStatus: appt.paymentStatus,
        meetingLink: appt.meetingLink,
        createdAt: appt.createdAt,
        updatedAt: appt.updatedAt,
      };
    }

    case "flw": {
      const flw = await FollowUp.findById(rawId)
        .populate("patientId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name email phone" },
        })
        .populate("appointmentId")
        .populate("consultationId")
        .lean();
      if (!flw) throw new NotFoundError("Follow-up record not found");

      return {
        id: eventId,
        rawId: flw._id,
        sourceType: "followup",
        title: `Care Follow-up: ${flw.patientId?.fullName || "Patient"}`,
        referenceCode: flw.followUpCode,
        category: "followup",
        color: "green",
        date: formatDateStr(flw.dueDate),
        startTime: formatTime12(flw.scheduledTime || "11:30 AM"),
        endTime: formatTime12("12:00 PM"),
        status: flw.status,
        serviceName: flw.serviceName,
        mode: flw.mode,
        interval: flw.interval,
        notes: flw.planInstructions || "Prescription and recovery monitoring",
        patient: flw.patientId,
        doctor: flw.doctorId,
        rescheduleHistory: flw.rescheduleHistory || [],
        createdAt: flw.createdAt,
        updatedAt: flw.updatedAt,
      };
    }

    case "session": {
      const parts = rawId.split("-");
      const docId = parts[0];
      const dateStr = parts.slice(1).join("-");

      const doc = await Doctor.findById(docId).populate("userId").lean();
      if (!doc) throw new NotFoundError("Doctor profile not found");

      // Find bookings for this doctor on this day
      const appointmentsOnDay = await Appointment.find({
        doctorId: doc._id,
        appointmentDate: dateStr,
        status: { $ne: "cancelled" },
      })
        .populate("patientId", "fullName patientCode phone")
        .lean();

      return {
        id: eventId,
        rawId: doc._id,
        sourceType: "doctor_session",
        title: `Doctor Session: ${doc.userId?.name || "Doctor"}`,
        referenceCode: `DOC-SES-${doc._id.toString().slice(-4)}`,
        category: "doctor_session",
        color: "purple",
        date: dateStr,
        startTime: "10:00 AM",
        endTime: "06:00 PM",
        status: "active",
        doctor: doc,
        branch: { name: doc.branchName || "Main Clinic" },
        bookedSlotsCount: appointmentsOnDay.length,
        appointments: appointmentsOnDay,
        notes: `Consulting session at ${doc.branchName || "Main Clinic"}. Specialization: ${doc.specialization?.join(", ")}`,
      };
    }

    case "leave": {
      const leave = await LeaveRequest.findById(rawId)
        .populate({
          path: "employeeId",
          populate: { path: "userId", select: "name email phone" },
        })
        .populate("reviewedBy", "name")
        .lean();
      if (!leave) throw new NotFoundError("Staff leave record not found");

      return {
        id: eventId,
        rawId: leave._id,
        sourceType: "staff_leave",
        title: `Staff Leave: ${leave.employeeId?.userId?.name || "Staff"}`,
        referenceCode: `LEV-${leave._id.toString().slice(-4)}`,
        category: "staff_leave",
        color: "red",
        date: formatDateStr(leave.startDate),
        endDate: formatDateStr(leave.endDate),
        startTime: "All Day",
        endTime: "All Day",
        allDay: true,
        status: leave.status,
        leaveType: leave.leaveType,
        reason: leave.reason,
        staff: leave.employeeId,
        reviewedBy: leave.reviewedBy,
        reviewNote: leave.reviewNote,
        createdAt: leave.createdAt,
      };
    }

    case "task": {
      const task = await Task.findById(rawId)
        .populate("assignedTo", "name email phone role")
        .populate("createdBy", "name")
        .lean();
      if (!task) throw new NotFoundError("Task record not found");

      return {
        id: eventId,
        rawId: task._id,
        sourceType: "task",
        title: task.title,
        referenceCode: `TSK-${task._id.toString().slice(-4)}`,
        category: "task",
        color: "amber",
        date: formatDateStr(task.dueDate),
        startTime: "05:00 PM",
        endTime: "06:00 PM",
        status: task.status,
        priority: task.priority,
        module: task.module,
        description: task.description,
        assignedTo: task.assignedTo,
        createdBy: task.createdBy,
        checklist: task.checklist || [],
        comments: task.comments || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }

    case "event": {
      const ie = await InstitutionalEvent.findById(rawId)
        .populate("doctorId", "userId specialization")
        .populate("assignedStaff", "name phone")
        .populate("createdBy", "name")
        .lean();
      if (!ie) throw new NotFoundError("Institutional event record not found");

      return {
        id: eventId,
        rawId: ie._id,
        sourceType: "institutional",
        title: ie.title,
        referenceCode: ie.eventCode,
        category: "institutional",
        color: "gray",
        date: ie.eventDate,
        endDate: ie.endDate,
        startTime: formatTime12(ie.startTime),
        endTime: formatTime12(ie.endTime),
        allDay: ie.allDay,
        status: ie.status,
        priority: ie.priority,
        location: ie.location,
        branchName: ie.branchName,
        description: ie.description,
        doctor: ie.doctorId,
        assignedStaff: ie.assignedStaff,
        rescheduleHistory: ie.rescheduleHistory || [],
        cancellationReason: ie.cancellationReason || "",
        createdAt: ie.createdAt,
        updatedAt: ie.updatedAt,
      };
    }

    default:
      throw new ValidationError(`Unknown event identifier prefix '${prefix}'`);
  }
}

/**
 * Validates scheduling conflicts before creating or rescheduling
 */
async function validateScheduleConflict({ doctorId, staffId, date, startTime, endTime, excludeEventId }) {
  const dateStr = formatDateStr(date);
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime || startTime) + (endTime ? 0 : 30);
  const conflicts = [];

  // 1. Doctor Conflict Checks
  if (doctorId) {
    const doctor = await Doctor.findById(doctorId).populate("userId").lean();
    if (doctor) {
      const docName = doctor.userId?.name || "Doctor";
      const dayOfWeek = new Date(dateStr).getDay();

      // A. Check doctor working hours
      const schedule = Array.isArray(doctor.workingHours)
        ? doctor.workingHours.find((w) => w.dayOfWeek === dayOfWeek)
        : null;

      if (!schedule) {
        conflicts.push({
          type: "DOCTOR_UNAVAILABLE",
          message: `${docName} is not scheduled to work on this day of week.`,
          severity: "warning",
        });
      } else {
        const schedStartMins = timeToMinutes(schedule.startTime);
        const schedEndMins = timeToMinutes(schedule.endTime);
        if (startMins < schedStartMins || endMins > schedEndMins) {
          conflicts.push({
            type: "OUTSIDE_WORKING_HOURS",
            message: `Selected slot (${startTime} - ${endTime}) falls outside ${docName}'s clinic hours (${schedule.startTime} - ${schedule.endTime}).`,
            severity: "warning",
          });
        }
      }

      // B. Check if doctor is on approved leave
      if (doctor.userId?._id) {
        const emp = await Employee.findOne({ userId: doctor.userId._id }).lean();
        if (emp) {
          const dateObj = new Date(dateStr);
          const leave = await LeaveRequest.findOne({
            employeeId: emp._id,
            status: "approved",
            startDate: { $lte: dateObj },
            endDate: { $gte: dateObj },
          }).lean();

          if (leave) {
            conflicts.push({
              type: "DOCTOR_ON_LEAVE",
              message: `${docName} has an approved ${leave.leaveType} leave on ${dateStr}.`,
              severity: "critical",
            });
          }
        }
      }

      // C. Check overlapping appointments
      const apptQuery = {
        doctorId: doctor._id,
        appointmentDate: dateStr,
        status: { $nin: ["cancelled", "rescheduled"] },
      };
      if (excludeEventId && excludeEventId.startsWith("appt-")) {
        apptQuery._id = { $ne: excludeEventId.replace("appt-", "") };
      }

      const existingAppts = await Appointment.find(apptQuery).populate("patientId", "fullName").lean();
      for (const a of existingAppts) {
        const aStart = timeToMinutes(a.startTime);
        const aEnd = timeToMinutes(a.endTime || a.startTime) + (a.endTime ? 0 : 30);
        if (startMins < aEnd && endMins > aStart) {
          conflicts.push({
            type: "DOUBLE_BOOKING_CONFLICT",
            message: `Overlaps with existing appointment for ${a.patientId?.fullName || "Patient"} at ${a.startTime} - ${a.endTime}.`,
            severity: "critical",
            conflictingId: `appt-${a._id}`,
          });
        }
      }
    }
  }

  // 2. Staff Conflict Checks
  if (staffId) {
    const staffUser = await User.findById(staffId).lean();
    if (staffUser) {
      const emp = await Employee.findOne({ userId: staffUser._id }).lean();
      if (emp) {
        const dateObj = new Date(dateStr);
        const leave = await LeaveRequest.findOne({
          employeeId: emp._id,
          status: "approved",
          startDate: { $lte: dateObj },
          endDate: { $gte: dateObj },
        }).lean();

        if (leave) {
          conflicts.push({
            type: "STAFF_ON_LEAVE",
            message: `${staffUser.name} is on approved leave on ${dateStr}.`,
            severity: "critical",
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    hasCriticalConflict: conflicts.some((c) => c.severity === "critical"),
    conflicts,
  };
}

/**
 * Creates an event in the appropriate source module
 */
async function createCalendarEvent(payload, user) {
  const {
    eventType,
    title,
    description,
    date,
    startTime = "10:00",
    endTime = "10:30",
    doctorId,
    patientId,
    staffId,
    branchName = "Main Clinic",
    serviceName,
    mode,
    leaveType,
    priority,
    overrideConflicts = false,
  } = payload;

  if (!eventType) throw new ValidationError("Event type is required");
  if (!date) throw new ValidationError("Event date is required");

  // Perform Conflict Detection
  const conflictCheck = await validateScheduleConflict({
    doctorId,
    staffId,
    date,
    startTime,
    endTime,
  });

  if (conflictCheck.hasCriticalConflict && !overrideConflicts) {
    throw new ValidationError(
      `Scheduling conflict detected: ${conflictCheck.conflicts.map((c) => c.message).join(" | ")}`
    );
  }

  let createdEvent;
  const dateStr = formatDateStr(date);

  switch (eventType) {
    case "appointment": {
      if (!patientId) throw new ValidationError("Patient is required for appointments");
      if (!doctorId) throw new ValidationError("Doctor is required for appointments");

      const randomCode = `TR-${Math.floor(1000 + Math.random() * 9000)}`;
      const appointment = await Appointment.create({
        appointmentCode: randomCode,
        patientId,
        doctorId,
        serviceName: serviceName || "Skin & Hair",
        appointmentDate: dateStr,
        startTime,
        endTime,
        mode: mode || "Online Video Consultation",
        notes: description || "Scheduled via Master Calendar",
        status: "scheduled",
        paymentStatus: "unpaid",
      });

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_APPOINTMENT_CREATED",
        targetEntity: "Appointment",
        targetId: appointment._id.toString(),
        details: { appointmentCode: randomCode, date: dateStr, startTime },
      });

      createdEvent = await getEventDetail(`appt-${appointment._id}`, user);
      break;
    }

    case "followup": {
      if (!patientId) throw new ValidationError("Patient is required for follow-ups");
      if (!doctorId) throw new ValidationError("Doctor is required for follow-ups");

      const randomCode = `FLW-2026-${Math.floor(100 + Math.random() * 900)}`;
      const followUp = await FollowUp.create({
        followUpCode: randomCode,
        patientId,
        doctorId,
        serviceName: serviceName || "Homoeopathic Care Review",
        dueDate: new Date(dateStr),
        scheduledTime: `${startTime} - ${endTime}`,
        mode: mode || "Video consultation",
        status: "scheduled",
        planInstructions: description || "Follow prescribed posology schedule.",
      });

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_FOLLOWUP_CREATED",
        targetEntity: "FollowUp",
        targetId: followUp._id.toString(),
        details: { followUpCode: randomCode, dueDate: dateStr },
      });

      createdEvent = await getEventDetail(`flw-${followUp._id}`, user);
      break;
    }

    case "doctor_session":
    case "institutional": {
      const randomCode = `INST-2026-${Math.floor(100 + Math.random() * 900)}`;
      const instEvent = await InstitutionalEvent.create({
        eventCode: randomCode,
        title: title || (eventType === "doctor_session" ? "Doctor Clinical Session" : "Institutional Activity"),
        description: description || "",
        category: eventType === "doctor_session" ? "doctor_session" : "administrative",
        eventDate: dateStr,
        startTime,
        endTime,
        doctorId: doctorId || null,
        assignedStaff: staffId || null,
        branchName: branchName || "Main Clinic",
        priority: priority || "medium",
        status: "scheduled",
        createdBy: user._id,
      });

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_INSTITUTIONAL_EVENT_CREATED",
        targetEntity: "InstitutionalEvent",
        targetId: instEvent._id.toString(),
        details: { eventCode: randomCode, title: instEvent.title },
      });

      createdEvent = await getEventDetail(`event-${instEvent._id}`, user);
      break;
    }

    case "staff_leave": {
      if (!staffId) throw new ValidationError("Staff member is required for leave");
      const emp = await Employee.findOne({ $or: [{ _id: staffId }, { userId: staffId }] });
      if (!emp) throw new ValidationError("Staff employee profile not found");

      const leave = await LeaveRequest.create({
        employeeId: emp._id,
        leaveType: leaveType || "casual",
        startDate: new Date(dateStr),
        endDate: new Date(payload.endDate ? formatDateStr(payload.endDate) : dateStr),
        reason: description || title || "Personal leave applied via calendar",
        status: "approved", // When created by authorized admin
        reviewedBy: user._id,
        reviewNote: "Approved via Master Calendar Administration",
      });

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_STAFF_LEAVE_CREATED",
        targetEntity: "LeaveRequest",
        targetId: leave._id.toString(),
        details: { employeeId: emp._id, leaveType: leave.leaveType },
      });

      createdEvent = await getEventDetail(`leave-${leave._id}`, user);
      break;
    }

    case "task": {
      const task = await Task.create({
        title: title || "Operational Calendar Task",
        description: description || "",
        module: payload.module || "clinical",
        priority: priority || "medium",
        status: "open",
        dueDate: new Date(dateStr),
        assignedTo: staffId || user._id,
        createdBy: user._id,
      });

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_TASK_CREATED",
        targetEntity: "Task",
        targetId: task._id.toString(),
        details: { taskId: task._id, title: task.title },
      });

      createdEvent = await getEventDetail(`task-${task._id}`, user);
      break;
    }

    default:
      throw new ValidationError(`Unsupported event type '${eventType}'`);
  }

  return createdEvent;
}

/**
 * Reschedules an event in its source module
 */
async function rescheduleCalendarEvent(eventId, { newDate, newStartTime, newEndTime, reason = "Rescheduled via Master Calendar" }, user) {
  if (!eventId) throw new ValidationError("Event ID is required");
  if (!newDate) throw new ValidationError("New date is required");

  const [prefix, ...rest] = eventId.split("-");
  const rawId = rest.join("-");
  const newDateStr = formatDateStr(newDate);

  switch (prefix) {
    case "appt": {
      const appt = await Appointment.findById(rawId);
      if (!appt) throw new NotFoundError("Appointment not found");

      // Check conflict
      const conflict = await validateScheduleConflict({
        doctorId: appt.doctorId,
        date: newDateStr,
        startTime: newStartTime || appt.startTime,
        endTime: newEndTime || appt.endTime,
        excludeEventId: eventId,
      });
      if (conflict.hasCriticalConflict) {
        throw new ValidationError(`Cannot reschedule: ${conflict.conflicts.map((c) => c.message).join("; ")}`);
      }

      const prevDate = appt.appointmentDate;
      const prevTime = appt.startTime;
      appt.appointmentDate = newDateStr;
      if (newStartTime) appt.startTime = newStartTime;
      if (newEndTime) appt.endTime = newEndTime;
      appt.status = "rescheduled";
      await appt.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_APPOINTMENT_RESCHEDULED",
        targetEntity: "Appointment",
        targetId: appt._id.toString(),
        details: { fromDate: prevDate, fromTime: prevTime, toDate: newDateStr, toTime: appt.startTime, reason },
      });

      return getEventDetail(eventId, user);
    }

    case "flw": {
      const flw = await FollowUp.findById(rawId);
      if (!flw) throw new NotFoundError("Follow-up not found");

      const prevDue = flw.dueDate;
      flw.dueDate = new Date(newDateStr);
      if (newStartTime) flw.scheduledTime = `${newStartTime} - ${newEndTime || "12:00 PM"}`;
      flw.status = "rescheduled";
      flw.rescheduleHistory.push({
        rescheduledAt: new Date(),
        previousDueDate: prevDue,
        newDueDate: flw.dueDate,
        reason,
        rescheduledBy: user._id,
      });
      await flw.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_FOLLOWUP_RESCHEDULED",
        targetEntity: "FollowUp",
        targetId: flw._id.toString(),
        details: { newDueDate: newDateStr, reason },
      });

      return getEventDetail(eventId, user);
    }

    case "event": {
      const ie = await InstitutionalEvent.findById(rawId);
      if (!ie) throw new NotFoundError("Institutional event not found");

      ie.rescheduleHistory.push({
        previousDate: ie.eventDate,
        previousStartTime: ie.startTime,
        previousEndTime: ie.endTime,
        rescheduledBy: user._id,
        reason,
      });
      ie.eventDate = newDateStr;
      if (newStartTime) ie.startTime = newStartTime;
      if (newEndTime) ie.endTime = newEndTime;
      ie.status = "rescheduled";
      await ie.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_INSTITUTIONAL_EVENT_RESCHEDULED",
        targetEntity: "InstitutionalEvent",
        targetId: ie._id.toString(),
        details: { newDate: newDateStr, reason },
      });

      return getEventDetail(eventId, user);
    }

    case "task": {
      const task = await Task.findById(rawId);
      if (!task) throw new NotFoundError("Task not found");
      task.dueDate = new Date(newDateStr);
      await task.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_TASK_RESCHEDULED",
        targetEntity: "Task",
        targetId: task._id.toString(),
        details: { newDueDate: newDateStr, reason },
      });

      return getEventDetail(eventId, user);
    }

    default:
      throw new ValidationError(`Rescheduling not supported for event type '${prefix}'`);
  }
}

/**
 * Cancels an event in its source module
 */
async function cancelCalendarEvent(eventId, { reason = "Cancelled via Master Calendar" }, user) {
  if (!eventId) throw new ValidationError("Event ID is required");

  const [prefix, ...rest] = eventId.split("-");
  const rawId = rest.join("-");

  switch (prefix) {
    case "appt": {
      const appt = await cancelAppointmentAtomic(rawId, reason, user);
      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_APPOINTMENT_CANCELLED",
        targetEntity: "Appointment",
        targetId: rawId,
        details: { reason },
      });
      return { success: true, message: "Appointment cancelled successfully" };
    }

    case "flw": {
      const flw = await FollowUp.findById(rawId);
      if (!flw) throw new NotFoundError("Follow-up not found");
      flw.status = "cancelled";
      await flw.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_FOLLOWUP_CANCELLED",
        targetEntity: "FollowUp",
        targetId: rawId,
        details: { reason },
      });
      return { success: true, message: "Follow-up cancelled successfully" };
    }

    case "event": {
      const ie = await InstitutionalEvent.findById(rawId);
      if (!ie) throw new NotFoundError("Institutional event not found");
      ie.status = "cancelled";
      ie.cancellationReason = reason;
      await ie.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_INSTITUTIONAL_EVENT_CANCELLED",
        targetEntity: "InstitutionalEvent",
        targetId: rawId,
        details: { reason },
      });
      return { success: true, message: "Institutional event cancelled successfully" };
    }

    case "task": {
      const task = await Task.findById(rawId);
      if (!task) throw new NotFoundError("Task not found");
      task.status = "cancelled";
      await task.save();

      await recordAudit({
        actorId: user._id,
        actorRole: user.role,
        action: "CALENDAR_TASK_CANCELLED",
        targetEntity: "Task",
        targetId: rawId,
        details: { reason },
      });
      return { success: true, message: "Task cancelled successfully" };
    }

    default:
      throw new ValidationError(`Cancellation not supported for event type '${prefix}'`);
  }
}

/**
 * Exports calendar events in CSV or iCalendar (ICS) format
 */
async function exportCalendarEvents({ startDate, endDate, format = "csv", type = "all", user }) {
  const events = await getAggregatedEvents({ startDate, endDate, type, user });

  if (format === "ics") {
    // Generate standard RFC 5545 iCalendar data
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TriGyna Healthcare//Master Institutional Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const e of events) {
      const dtStart = e.date.replace(/-/g, "") + (e.allDay ? "" : "T" + (e.startTime ? e.startTime.replace(/[^0-9]/g, "").padStart(6, "0").slice(0, 4) + "00" : "090000"));
      const dtEnd = (e.endDate || e.date).replace(/-/g, "") + (e.allDay ? "" : "T" + (e.endTime ? e.endTime.replace(/[^0-9]/g, "").padStart(6, "0").slice(0, 4) + "00" : "100000"));

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${e.id}@trigyna.in`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${e.title.replace(/[,;]/g, " ")}`);
      lines.push(`DESCRIPTION:${(e.description || e.details || "").replace(/[,;\n]/g, " ")}`);
      lines.push(`STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    return {
      contentType: "text/calendar",
      filename: `trigyna_calendar_${formatDateStr(new Date())}.ics`,
      data: lines.join("\r\n"),
    };
  }

  // Standard CSV export
  const headers = [
    "Event ID",
    "Source Type",
    "Reference Code",
    "Title",
    "Category",
    "Date",
    "Start Time",
    "End Time",
    "Status",
    "Doctor / Practitioner",
    "Patient / Client",
    "Staff Assigned",
    "Branch",
    "Details",
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = events.map((e) => [
    escapeCsv(e.id),
    escapeCsv(e.sourceType),
    escapeCsv(e.referenceCode || ""),
    escapeCsv(e.title),
    escapeCsv(e.category),
    escapeCsv(e.date),
    escapeCsv(e.startTime),
    escapeCsv(e.endTime),
    escapeCsv(e.status),
    escapeCsv(e.doctor?.name || ""),
    escapeCsv(user?.role !== "sales" ? e.patient?.fullName || "" : "[Protected]"),
    escapeCsv(e.staff?.name || ""),
    escapeCsv(e.branch?.name || "Main Clinic"),
    escapeCsv(e.details || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return {
    contentType: "text/csv",
    filename: `trigyna_master_calendar_${formatDateStr(new Date())}.csv`,
    data: csvContent,
  };
}

module.exports = {
  getAggregatedEvents,
  getCalendarStats,
  getCalendarAgenda,
  getStreamCounts,
  getEventDetail,
  validateScheduleConflict,
  createCalendarEvent,
  rescheduleCalendarEvent,
  cancelCalendarEvent,
  exportCalendarEvents,
};

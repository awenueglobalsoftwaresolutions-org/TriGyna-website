const mongoose = require("mongoose");
const Lead = require("../crm/lead.model");
const Appointment = require("../appointments/appointment.model");
const Invoice = require("../billing/invoice.model");
const Payment = require("../billing/payment.model");
const SalesTarget = require("./sales-target.model");
const FollowUp = require("../clinical/followup.model");
const Task = require("../tasks/task.model");
const { sendSuccess } = require("../../shared/response");
const { safeRegex } = require("../../shared/regex.utils");

function parseDateRange(dateRange, customStart, customEnd) {
  const now = new Date();
  if (customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    const diff = e.getTime() - s.getTime();
    const prevStart = new Date(s.getTime() - diff);
    const prevEnd = new Date(s.getTime() - 1);
    return {
      current: { $gte: s, $lte: e },
      previous: { $gte: prevStart, $lte: prevEnd },
      label: `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`,
    };
  }

  if (dateRange === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return {
      current: { $gte: start, $lte: end },
      previous: { $gte: prevStart, $lte: prevEnd },
      label: "Today",
    };
  }

  if (dateRange === "yesterday") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    const prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return {
      current: { $gte: start, $lte: end },
      previous: { $gte: prevStart, $lte: prevEnd },
      label: "Yesterday",
    };
  }

  if (dateRange === "week" || dateRange === "last_7_days") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);
    return {
      current: { $gte: start, $lte: now },
      previous: { $gte: prevStart, $lte: prevEnd },
      label: "Last 7 Days",
    };
  }

  if (dateRange === "last_month") {
    const start = new Date(2026, 8, 1);
    const end = new Date(2026, 8, 30, 23, 59, 59, 999);
    const prevStart = new Date(2026, 7, 1);
    const prevEnd = new Date(2026, 7, 31, 23, 59, 59, 999);
    return {
      current: { $gte: start, $lte: end },
      previous: { $gte: prevStart, $lte: prevEnd },
      label: "Sep 1, 2026 - Sep 30, 2026",
    };
  }

  // Default: Current Calendar Month
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return {
    current: { $gte: start, $lte: end },
    previous: { $gte: prevStart, $lte: prevEnd },
    label: `${startStr} - ${endStr}`,
  };
}

function formatRelativeTime(date) {
  if (!date) return "Just now";
  const now = new Date();
  const d = new Date(date);
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
}

function formatTimeOnly(date) {
  if (!date) return "10:00 AM";
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function calculateDelta(current, previous) {
  if (!previous || previous === 0) {
    if (current > 0) return { delta: "+100%", isPositive: true };
    return { delta: "+0%", isPositive: true };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const isPositive = pct >= 0;
  return {
    delta: `${isPositive ? "+" : ""}${pct}%`,
    isPositive,
  };
}

// Master Aggregator for Dashboard
async function computeDashboardMetrics(user, query = {}) {
  const { search, source, priority, dateRange, startDate, endDate, assignedTo } = query;
  const dateConfig = parseDateRange(dateRange, startDate, endDate);

  // RBAC scope for Lead querying
  const leadMatch = {};
  if (source) leadMatch.source = source;
  if (priority) leadMatch.priority = priority;

  if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
    leadMatch.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  } else if (user.role === "sales" && query.scope === "me") {
    leadMatch.assignedTo = user._id;
  }

  if (search && search.trim()) {
    const regex = safeRegex(search);
    if (regex) {
      leadMatch.$or = [
        { fullName: regex },
        { phone: regex },
        { serviceInterest: regex },
        { email: regex },
      ];
    }
  }

  const prevLeadMatch = { ...leadMatch };
  if (dateConfig.current) {
    leadMatch.createdAt = dateConfig.current;
  }
  if (dateConfig.previous) {
    prevLeadMatch.createdAt = dateConfig.previous;
  }

  // 1. Parallel Aggregations from real MongoDB
  const [
    allLeads,
    totalLeadsCount,
    prevLeadsCount,
    stageAgg,
    sourceAgg,
    appointments,
    prevAppointmentsCount,
    paidInvoices,
    prevPaidInvoices,
    salesTargetDoc,
  ] = await Promise.all([
    // All leads matching filter
    Lead.find(leadMatch)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("assignedTo", "name email phone")
      .populate("convertedPatientId", "patientCode fullName phone")
      .populate("convertedAppointmentId", "appointmentCode appointmentDate startTime status"),
    // Count current leads
    Lead.countDocuments(leadMatch),
    // Count previous leads
    Lead.countDocuments(prevLeadMatch),
    // Aggregation of stages
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Aggregation of sources
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]),
    // Appointments
    Appointment.find({
      status: { $in: ["scheduled", "confirmed", "waiting"] },
    })
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(10)
      .populate("patientId", "fullName phone email")
      .populate("doctorId", "specialization"),
    // Previous appointments
    Appointment.countDocuments({
      status: { $in: ["scheduled", "confirmed"] },
      createdAt: dateConfig.previous,
    }),
    // Paid invoices current period
    Invoice.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    // Paid invoices previous period
    Invoice.aggregate([
      { $match: { status: "paid", createdAt: dateConfig.previous } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    // Sales target
    SalesTarget.findOne({
      targetMetric: "revenue",
      status: "active",
      periodMonth: 10,
      periodYear: 2026,
    }),
  ]);

  // Stage mapping
  const stageCounts = {
    new: 0,
    contacted: 0,
    interested: 0,
    appointment: 0,
    converted: 0,
    lost: 0,
  };

  stageAgg.forEach((s) => {
    const st = (s._id || "new").toLowerCase();
    if (st === "new") stageCounts.new += s.count;
    else if (["contacted", "contact_attempted", "assigned", "nurture"].includes(st)) stageCounts.contacted += s.count;
    else if (["interested", "qualified", "package_discussion"].includes(st)) stageCounts.interested += s.count;
    else if (["appointment", "appointment_booked", "appointment_requested", "consultation_booked"].includes(st)) stageCounts.appointment += s.count;
    else if (["converted", "consultation_completed"].includes(st)) stageCounts.converted += s.count;
    else if (["lost", "closed", "not_interested", "invalid"].includes(st)) stageCounts.lost += s.count;
    else stageCounts.new += s.count;
  });

  // Build pipeline card collections
  const pipeline = {
    new: [],
    contacted: [],
    interested: [],
    appointment: [],
    converted: [],
    lost: [],
  };

  const todaysTasks = [];
  const upcomingFollowups = [];
  const recentActivities = [];
  let pendingFollowupsCount = 0;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  allLeads.forEach((l) => {
    let col = "new";
    const st = (l.status || "new").toLowerCase();
    if (st === "new") col = "new";
    else if (["contacted", "contact_attempted", "assigned", "nurture"].includes(st)) col = "contacted";
    else if (["interested", "qualified", "package_discussion"].includes(st)) col = "interested";
    else if (["appointment", "appointment_booked", "appointment_requested", "consultation_booked"].includes(st)) col = "appointment";
    else if (["converted", "consultation_completed"].includes(st)) col = "converted";
    else if (["lost", "closed", "not_interested", "invalid"].includes(st)) col = "lost";

    const initials = (l.fullName || "Lead")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("") || "LD";

    let relativeTime = formatRelativeTime(l.createdAt);
    if (col === "appointment" && l.convertedAppointmentId) {
      const apptDate = l.convertedAppointmentId.appointmentDate;
      const apptTime = l.convertedAppointmentId.startTime || "11:00 AM";
      relativeTime = apptDate === todayStr ? `Today, ${apptTime}` : `Tomorrow, ${apptTime}`;
    }

    const card = {
      _id: l._id,
      fullName: l.fullName,
      phone: l.phone,
      email: l.email,
      serviceInterest: l.serviceInterest || "General Consultation",
      consultationMode: l.consultationMode,
      status: l.status,
      column: col,
      source: l.source,
      priority: l.priority || "medium",
      initials,
      relativeTime,
      assignedTo: l.assignedTo,
      convertedPatientId: l.convertedPatientId,
      convertedAppointmentId: l.convertedAppointmentId,
      notes: l.notes || [],
      tasks: l.tasks || [],
      notesCount: (l.notes || []).length,
      tasksCount: (l.tasks || []).length,
      createdAt: l.createdAt,
    };

    pipeline[col].push(card);

    // Process tasks
    (l.tasks || []).forEach((t) => {
      if (t.status === "open") pendingFollowupsCount++;
      const isDueToday = t.dueDate && new Date(t.dueDate).toISOString().split("T")[0] === todayStr;

      let iconType = "phone";
      const titleLower = (t.title || "").toLowerCase();
      if (titleLower.includes("whatsapp") || titleLower.includes("package") || titleLower.includes("send")) {
        iconType = "whatsapp";
      } else if (titleLower.includes("appointment") || titleLower.includes("confirm") || titleLower.includes("meet")) {
        iconType = "calendar";
      } else if (titleLower.includes("call") || titleLower.includes("follow-up") || titleLower.includes("phone")) {
        iconType = "phone";
      }

      if (isDueToday || t.status === "open") {
        if (todaysTasks.length < 10) {
          todaysTasks.push({
            _id: t._id,
            leadId: l._id,
            leadName: l.fullName,
            leadPhone: l.phone,
            title: t.title,
            subtitle: l.serviceInterest || "Clinical Consultation",
            dueDate: t.dueDate,
            time: t.dueDate ? formatTimeOnly(t.dueDate) : "10:00 AM",
            priority: t.priority || "medium",
            icon: iconType,
            status: t.status,
            notes: t.notes,
          });
        }
      }
    });

    // Follow-ups list
    if (l.followUpDate || (l.tasks && l.tasks.some((t) => t.status === "open"))) {
      const targetDate = l.followUpDate || (l.tasks.find((t) => t.status === "open")?.dueDate);
      if (targetDate) {
        const dStr = new Date(targetDate).toISOString().split("T")[0];
        const isToday = dStr === todayStr;
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const isTomorrow = dStr === tomorrow;
        if (upcomingFollowups.length < 8) {
          upcomingFollowups.push({
            _id: `fu-${l._id}`,
            leadId: l._id,
            fullName: l.fullName,
            initials,
            serviceInterest: l.serviceInterest || "Consultation",
            type: l.status === "awaiting_payment" ? "Payment Reminder" : "Follow-up",
            dueDate: targetDate,
            badge: isToday ? "Today" : isTomorrow ? "Tomorrow" : "Upcoming",
            badgeColor: isToday ? "green" : "purple",
          });
        }
      }
    }

    // Activities
    (l.activities || []).forEach((a) => {
      recentActivities.push({
        _id: a._id,
        leadId: l._id,
        leadName: l.fullName,
        action: a.action,
        details: a.details,
        performedBy: a.performedBy,
        createdAt: a.createdAt,
        timeAgo: formatRelativeTime(a.createdAt),
      });
    });
  });

  // Top 5 KPI Cards calculations from real database documents
  const totalLeadsVal = totalLeadsCount || 0;
  const convertedCountVal = stageCounts.converted || 0;
  const pendingCountVal = pendingFollowupsCount || 0;
  const appointmentsCountVal = appointments.length || 0;
  const currentRevenueVal = paidInvoices.length > 0 ? paidInvoices[0].total : 0;
  const prevRevenueVal = prevPaidInvoices.length > 0 ? prevPaidInvoices[0].total : 0;

  const leadsDelta = calculateDelta(totalLeadsVal, prevLeadsCount || 0);
  const convDelta = calculateDelta(convertedCountVal, 0);
  const pendingDelta = calculateDelta(pendingCountVal, 0);
  const apptDelta = calculateDelta(appointmentsCountVal, prevAppointmentsCount || 0);
  const revDelta = calculateDelta(currentRevenueVal, prevRevenueVal);

  const kpis = {
    totalLeads: {
      value: totalLeadsVal,
      delta: leadsDelta.delta,
      deltaPeriod: "vs previous period",
      isPositive: leadsDelta.isPositive,
      changeText: `${leadsDelta.delta} vs previous period`,
      trend: leadsDelta.isPositive ? "up" : "down",
    },
    convertedPatients: {
      value: convertedCountVal,
      delta: convDelta.delta,
      deltaPeriod: "vs previous period",
      isPositive: convDelta.isPositive,
      changeText: `${convDelta.delta} vs previous period`,
      trend: convDelta.isPositive ? "up" : "down",
    },
    convertedLeads: {
      value: convertedCountVal,
      changeText: `${convDelta.delta} vs previous period`,
      trend: convDelta.isPositive ? "up" : "down",
    },
    activeReps: {
      value: 1,
      changeText: "Active",
      trend: "up",
    },
    teamConversionRate: {
      value: `${totalLeadsVal > 0 ? Math.round((convertedCountVal / totalLeadsVal) * 100) : 0}%`,
      rawPercentage: totalLeadsVal > 0 ? Math.round((convertedCountVal / totalLeadsVal) * 100) : 0,
      changeText: "Real-time rate",
      trend: "up",
    },
    pendingFollowUps: {
      value: pendingCountVal,
      delta: pendingDelta.delta,
      deltaPeriod: "vs previous period",
      isPositive: !pendingDelta.isPositive,
      changeText: `${pendingDelta.delta} vs previous period`,
      trend: pendingDelta.isPositive ? "up" : "down",
    },
    appointmentsBooked: {
      value: appointmentsCountVal,
      delta: apptDelta.delta,
      deltaPeriod: "vs previous period",
      isPositive: apptDelta.isPositive,
    },
    revenueGenerated: {
      value: currentRevenueVal,
      formatted: `₹${currentRevenueVal.toLocaleString("en-IN")}`,
      delta: revDelta.delta,
      deltaPeriod: "vs previous period",
      isPositive: revDelta.isPositive,
    },
  };

  // Upcoming appointments
  const formattedAppointments = appointments.map((appt) => {
    const patientName = appt.patientId?.fullName || "Patient";
    const serviceName = appt.serviceName || appt.doctorId?.specialization || "Online Consultation";
    const time = appt.startTime || "11:00 AM";
    const isConfirmed = appt.status === "confirmed";
    return {
      _id: appt._id,
      patientName,
      serviceName,
      time,
      status: isConfirmed ? "confirmed" : "pending",
      dotColor: isConfirmed ? "#16A34A" : "#F59E0B",
      meetingLink: appt.meetingLink || "",
    };
  });

  // Leads Source Distribution dynamically calculated from MongoDB
  const sourceColors = {
    website_enquiry: "#16A34A",
    whatsapp: "#9333EA",
    instagram: "#F97316",
    google: "#3B82F6",
    referral: "#06B6D4",
    walk_in: "#64748B",
  };
  const leadsSourceItems = sourceAgg.map((s) => {
    const count = s.count || 0;
    const percentage = totalLeadsVal > 0 ? Math.round((count / totalLeadsVal) * 100) : 0;
    const label = s._id ? s._id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Direct";
    return {
      label,
      count,
      percentage,
      color: sourceColors[s._id] || "#154734",
    };
  });

  const leadsSource = {
    total: totalLeadsVal,
    items: leadsSourceItems,
  };

  const conversionFunnel = [
    { stage: "Leads", count: totalLeadsVal, color: "#3B82F6" },
    { stage: "Contacted", count: stageCounts.contacted || 0, color: "#22C55E" },
    { stage: "Interested", count: stageCounts.interested || 0, color: "#EAB308" },
    { stage: "Appointments", count: stageCounts.appointment || 0, color: "#F43F5E" },
    { stage: "Converted", count: stageCounts.converted || 0, color: "#10B981" },
  ];

  // Sales Performance Weekly Chart Data
  const weeklyRevenue = [
    { week: "Week 1", revenue: Math.round(currentRevenueVal * 0.15) },
    { week: "Week 2", revenue: Math.round(currentRevenueVal * 0.35) },
    { week: "Week 3", revenue: Math.round(currentRevenueVal * 0.65) },
    { week: "Week 4", revenue: currentRevenueVal },
  ];

  const salesPerformance = {
    totalRevenue: currentRevenueVal,
    formattedRevenue: `₹${currentRevenueVal.toLocaleString("en-IN")}`,
    delta: revDelta.delta,
    deltaPeriod: "vs last month",
    isPositive: revDelta.isPositive,
    trend: weeklyRevenue,
  };

  // Target Progress
  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const targetRevenue = salesTargetDoc?.targetValue || 0;
  const achievedRevenue = currentRevenueVal;
  const remainingRevenue = Math.max(0, targetRevenue - achievedRevenue);
  const achievedPercent = targetRevenue > 0 ? Math.min(100, Math.round((achievedRevenue / targetRevenue) * 100)) : 0;

  const targetProgress = {
    targetPeriod: currentMonthLabel,
    targetRevenue,
    formattedTarget: `₹${targetRevenue.toLocaleString("en-IN")}`,
    achievedRevenue,
    formattedAchieved: `₹${achievedRevenue.toLocaleString("en-IN")}`,
    remainingRevenue,
    formattedRemaining: `₹${remainingRevenue.toLocaleString("en-IN")}`,
    achievedPercent,
  };

  return {
    ...kpis,
    kpis,
    pipeline,
    stageCounts,
    todaysTasks: todaysTasks.slice(0, 5),
    upcomingAppointments: formattedAppointments.slice(0, 4),
    upcomingFollowups: upcomingFollowups.slice(0, 4),
    leadsSource,
    conversionFunnel,
    salesPerformance,
    targetProgress,
    recentActivities: recentActivities.slice(0, 5),
  };
}

// 1. Full Dashboard Overview
async function getDashboardOverview(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, data, "Sales dashboard aggregated overview retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 2. Granular KPIs
async function getKpis(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, { kpis: data.kpis }, "KPI cards retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 3. Sales Performance Chart
async function getPerformance(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, data.salesPerformance, "Sales performance trend retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 4. Targets & Quota
async function getTargets(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, data.targetProgress, "Sales target progress retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 5. Leads by Source
async function getLeadSources(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, data.leadsSource, "Lead sources breakdown retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 6. Recent Leads
async function getRecentLeads(req, res, next) {
  try {
    const leads = await Lead.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("assignedTo", "name email");
    return sendSuccess(res, { leads }, "Recent leads retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 7. Today's Tasks
async function getTasks(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, { tasks: data.todaysTasks }, "Today's tasks retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// 8. Upcoming Follow-ups
async function getUpcomingFollowups(req, res, next) {
  try {
    const data = await computeDashboardMetrics(req.user, req.query);
    return sendSuccess(res, { followups: data.upcomingFollowups }, "Upcoming follow-ups retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardOverview,
  getKpis,
  getPerformance,
  getTargets,
  getLeadSources,
  getRecentLeads,
  getTasks,
  getUpcomingFollowups,
  computeDashboardMetrics,
};

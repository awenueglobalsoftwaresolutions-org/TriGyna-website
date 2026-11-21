const Lead = require("../crm/lead.model");
const Appointment = require("../appointments/appointment.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const Attendance = require("../hrms/attendance.model");
const Employee = require("../hrms/employee.model");
const LeaveRequest = require("../hrms/leave.model");
const Invoice = require("../billing/invoice.model");
const Expense = require("../billing/expense.model");
const { sendSuccess } = require("../../shared/response");
const { getOrSetCache } = require("../../infrastructure/redis/redisCache");
const redisKeys = require("../../infrastructure/redis/redisKeys");

function getDateFilter(range) {
  if (!range || range === "all_time") return null;
  const now = new Date();
  if (range === "current_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateObj: { $gte: start, $lte: now },
      dateStr: { $gte: start.toISOString().split("T")[0], $lte: now.toISOString().split("T")[0] },
    };
  }
  if (range === "last_quarter") {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      dateObj: { $gte: start, $lte: now },
      dateStr: { $gte: start.toISOString().split("T")[0], $lte: now.toISOString().split("T")[0] },
    };
  }
  return null;
}

async function getDashboardSummary(req, res, next) {
  try {
    const range = req.query.range || req.query.dateRange || "all_time";
    const cacheKey = redisKeys.reportsSummaryKey(range);
    const ttlSeconds = process.env.NODE_ENV === "test" ? 2 : 120; // 2 minutes in production, 2s in test

    const reportData = await getOrSetCache(cacheKey, ttlSeconds, async () => {
      const today = new Date().toISOString().split("T")[0];
      const filter = getDateFilter(range);

      const leadBase = filter ? { createdAt: filter.dateObj } : {};
      const apptBase = filter ? { appointmentDate: filter.dateStr } : {};
      const invoiceQuery = filter ? { createdAt: filter.dateObj } : {};
      const expenseQuery = filter ? { createdAt: filter.dateObj } : {};

      const [
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        todayAppointments,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalPatients,
        activeDoctors,
        todayAttendance,
        totalEmployees,
        pendingLeaves,
        invoices,
        expenses,
      ] = await Promise.all([
        Lead.countDocuments(leadBase),
        Lead.countDocuments({ ...leadBase, status: "new" }),
        Lead.countDocuments({ ...leadBase, status: "qualified" }),
        Lead.countDocuments({ ...leadBase, status: "converted" }),
        Appointment.countDocuments({ appointmentDate: today }),
        Appointment.countDocuments(apptBase),
        Appointment.countDocuments({ ...apptBase, status: "completed" }),
        Appointment.countDocuments({ ...apptBase, status: "cancelled" }),
        Patient.countDocuments(filter ? { createdAt: filter.dateObj } : {}),
        Doctor.countDocuments({ status: "active" }),
        Attendance.countDocuments({ workDate: today }),
        Employee.countDocuments({ status: "active" }),
        LeaveRequest.countDocuments({ status: "pending" }),
        Invoice.find(invoiceQuery),
        Expense.find(expenseQuery),
      ]);

      // Financial sums derived from stored records
      let totalBilled = 0;
      let totalCollected = 0;
      let totalDues = 0;
      let totalRefunds = 0;

      invoices.forEach((inv) => {
        totalBilled += inv.totalAmount || 0;
        totalCollected += inv.paidAmount || 0;
        if (inv.status === "pending" || inv.status === "partially_paid") {
          totalDues += inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount - (inv.paidAmount || 0);
        }
        if (inv.status === "refunded" && inv.refundDetails?.refundAmount) {
          totalRefunds += inv.refundDetails.refundAmount;
        }
      });

      let totalExpenses = 0;
      expenses.forEach((exp) => {
        totalExpenses += exp.amount || 0;
      });

      const netCashFlow = totalCollected - totalRefunds - totalExpenses;
      const conversionRate = totalLeads > 0 ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

      return {
        metrics: {
          crm: {
            totalLeads,
            newLeads,
            qualifiedLeads,
            convertedLeads,
            conversionRate,
          },
          appointments: {
            todayAppointments,
            totalAppointments,
            completedAppointments,
            cancelledAppointments,
          },
          clinical: {
            totalPatients,
            activeDoctors,
          },
          hrms: {
            todayAttendance,
            totalEmployees,
            pendingLeaves,
          },
          finance: {
            totalBilled,
            totalCollected,
            totalDues,
            totalRefunds,
            totalExpenses,
            netCashFlow,
          },
          billing: {
            totalBilled,
            totalRevenue: totalCollected,
            pendingDues: totalDues,
            totalRefunds,
            totalExpenses,
            netCashFlow,
          },
        },
      };
    });

    return sendSuccess(res, reportData, "Real-time database metrics retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardSummary,
};

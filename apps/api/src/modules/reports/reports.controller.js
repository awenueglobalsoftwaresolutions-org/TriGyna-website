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

async function getDashboardSummary(req, res, next) {
  try {
    const today = new Date().toISOString().split("T")[0];

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
      Lead.countDocuments(),
      Lead.countDocuments({ status: "new" }),
      Lead.countDocuments({ status: "qualified" }),
      Lead.countDocuments({ status: "converted" }),
      Appointment.countDocuments({ appointmentDate: today }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "completed" }),
      Appointment.countDocuments({ status: "cancelled" }),
      Patient.countDocuments(),
      Doctor.countDocuments({ status: "active" }),
      Attendance.countDocuments({ workDate: today }),
      Employee.countDocuments({ status: "active" }),
      LeaveRequest.countDocuments({ status: "pending" }),
      Invoice.find(),
      Expense.find(),
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

    return sendSuccess(
      res,
      {
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
      },
      "Real-time database metrics retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardSummary,
};

const LeaveRequest = require("../hrms/leave.model");
const AttendanceCorrection = require("../hrms/attendance-correction.model");
const Lead = require("../crm/lead.model");
const Invoice = require("../billing/invoice.model");
const RefundRequest = require("../billing/refund-request.model");
const { sendSuccess } = require("../../shared/response");

async function getPendingApprovals(req, res, next) {
  try {
    const [pendingLeaves, pendingCorrections, unassignedLeads, pendingInvoices, pendingRefunds] = await Promise.all([
      LeaveRequest.find({ status: "pending" })
        .populate({
          path: "employeeId",
          populate: { path: "userId", select: "name email phone" },
        })
        .sort({ createdAt: -1 }),
      AttendanceCorrection.find({ status: "pending" })
        .populate({
          path: "employeeId",
          populate: { path: "userId", select: "name email phone" },
        })
        .sort({ createdAt: -1 }),
      Lead.find({ status: "new", assignedTo: null }).sort({ createdAt: -1 }).limit(20),
      Invoice.find({ status: "pending" })
        .populate("patientId", "patientCode fullName phone")
        .sort({ createdAt: -1 })
        .limit(20),
      RefundRequest.find({ status: "pending" })
        .populate("patientId", "patientCode fullName phone email")
        .populate("orderId", "orderNumber totalAmount paidAmount")
        .populate("invoiceId", "invoiceNumber totalAmount paidAmount")
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    const totalPendingCount =
      pendingLeaves.length + pendingCorrections.length + unassignedLeads.length + pendingRefunds.length;

    return sendSuccess(
      res,
      {
        totalPendingCount,
        pendingLeaves,
        pendingCorrections,
        pendingRefunds,
        unassignedLeads,
        pendingInvoices,
      },
      "Pending operational approvals retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getPendingApprovals,
};

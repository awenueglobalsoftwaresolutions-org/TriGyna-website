const Appointment = require("../appointments/appointment.model");
const FollowUp = require("../clinical/followup.model");
const LeaveRequest = require("../hrms/leave.model");
const Task = require("../tasks/task.model");
const Doctor = require("../doctors/doctor.model");
const { sendSuccess } = require("../../shared/response");

async function getCalendarEvents(req, res, next) {
  try {
    const { startDate, endDate, doctorId, employeeId, type = "all" } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 15));
    const end = endDate ? new Date(endDate) : new Date(new Date().setDate(new Date().getDate() + 30));

    const events = [];

    // 1. Fetch Appointments
    if (type === "all" || type === "appointment") {
      const apptQuery = {
        appointmentDate: {
          $gte: start.toISOString().split("T")[0],
          $lte: end.toISOString().split("T")[0],
        },
      };
      if (doctorId) apptQuery.doctorId = doctorId;

      const appointments = await Appointment.find(apptQuery)
        .populate("patientId", "fullName patientCode phone")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        });

      appointments.forEach((a) => {
        const docName = a.doctorId?.userId?.name || "Dr. TriGyna Specialist";
        const patName = a.patientId?.fullName || "Patient";
        events.push({
          id: `appt-${a._id}`,
          rawId: a._id,
          title: `Dr. ${docName} - ${patName} (${a.consultationType || "Consultation"})`,
          eventType: "appointment",
          date: a.appointmentDate,
          time: a.slotTime,
          status: a.status,
          doctorName: docName,
          patientName: patName,
          details: `Slot: ${a.slotTime} | Status: ${a.status} | Reason: ${a.reasonForVisit || "Routine"}`,
          color: a.status === "completed" ? "emerald" : a.status === "cancelled" ? "red" : "blue",
        });
      });
    }

    // 2. Fetch Follow-ups
    if (type === "all" || type === "followup") {
      const flwQuery = {
        dueDate: { $gte: start, $lte: end },
      };
      if (doctorId) flwQuery.doctorId = doctorId;

      const followUps = await FollowUp.find(flwQuery)
        .populate("patientId", "fullName patientCode phone")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        });

      followUps.forEach((f) => {
        const patName = f.patientId?.fullName || "Patient";
        events.push({
          id: `flw-${f._id}`,
          rawId: f._id,
          title: `Follow-up: ${patName} (${f.serviceName})`,
          eventType: "followup",
          date: f.dueDate.toISOString().split("T")[0],
          time: f.scheduledTime || "11:30 AM",
          status: f.status,
          patientName: patName,
          details: `Service: ${f.serviceName} | Interval: ${f.interval} | Mode: ${f.mode}`,
          color: f.status === "completed" ? "emerald" : "purple",
        });
      });
    }

    // 3. Fetch Approved Staff Leaves
    if (type === "all" || type === "leave") {
      const leaves = await LeaveRequest.find({
        status: "approved",
      }).populate({
        path: "employeeId",
        populate: { path: "userId", select: "name" },
      });

      leaves.forEach((l) => {
        const staffName = l.employeeId?.userId?.name || "Staff Member";
        events.push({
          id: `leave-${l._id}`,
          rawId: l._id,
          title: `Leave: ${staffName} (${l.leaveType})`,
          eventType: "leave",
          date: l.startDate,
          endDate: l.endDate,
          time: "All Day",
          status: "approved",
          staffName,
          details: `Days: ${l.totalDays} | Reason: ${l.reason}`,
          color: "amber",
        });
      });
    }

    // 4. Fetch Tasks
    if (type === "all" || type === "task") {
      const taskQuery = {
        dueDate: { $gte: start, $lte: end },
      };
      if (employeeId) taskQuery.assignedTo = employeeId;

      const tasks = await Task.find(taskQuery).populate("assignedTo", "name phone");

      tasks.forEach((t) => {
        events.push({
          id: `task-${t._id}`,
          rawId: t._id,
          title: `Task: ${t.title} [${t.priority.toUpperCase()}]`,
          eventType: "task",
          date: t.dueDate ? t.dueDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          time: "By End of Day",
          status: t.status,
          assignedStaff: t.assignedTo?.name || "Unassigned",
          details: `Module: ${t.module} | Priority: ${t.priority}`,
          color: t.status === "completed" ? "gray" : t.priority === "high" ? "red" : "teal",
        });
      });
    }

    // Sort chronologically
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sendSuccess(
      res,
      {
        events,
        total: events.length,
        summary: {
          appointments: events.filter((e) => e.eventType === "appointment").length,
          followups: events.filter((e) => e.eventType === "followup").length,
          leaves: events.filter((e) => e.eventType === "leave").length,
          tasks: events.filter((e) => e.eventType === "task").length,
        },
      },
      "Calendar events retrieved successfully"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getCalendarEvents,
};

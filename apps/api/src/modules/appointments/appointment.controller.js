const Appointment = require("./appointment.model");
const Doctor = require("../doctors/doctor.model");
const Patient = require("../patients/patient.model");
const SlotReservation = require("./slot-reservation.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

const { generateAtomicAppointmentCode } = require("../../shared/counter.service");
const {
  bookAppointmentAtomic,
  rescheduleAppointmentAtomic,
  cancelAppointmentAtomic,
} = require("./booking.service");

async function listAppointments(req, res, next) {
  try {
    const { date, doctorId, patientId, status } = req.query;
    const query = {};

    if (date) query.appointmentDate = date;
    if (status) query.status = status;

    // Role-based scoping
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!myPatient) {
        return sendSuccess(res, { appointments: [], count: 0 }, "No appointments found");
      }
      query.patientId = myPatient._id;
    } else if (req.user.role === "doctor") {
      const myDoctor = await Doctor.findOne({ userId: req.user._id });
      if (myDoctor) {
        query.doctorId = myDoctor._id;
      }
    } else {
      if (doctorId) query.doctorId = doctorId;
      if (patientId) query.patientId = patientId;
    }

    let queryChain = Appointment.find(query)
      .sort({ appointmentDate: -1, startTime: 1 })
      .populate("patientId", "fullName phone patientCode age gender")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    const parsedLimit = parseInt(req.query.limit, 10);
    if (parsedLimit > 0) {
      queryChain = queryChain.limit(parsedLimit);
    }

    const appointments = await queryChain;

    return sendSuccess(res, { appointments, count: appointments.length }, "Appointments retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createAppointment(req, res, next) {
  try {
    const {
      patientId,
      doctorId,
      serviceName,
      appointmentDate,
      startTime,
      endTime,
      mode,
      notes,
      bookingSource = "portal",
    } = req.body;

    let effectivePatientId = patientId;

    // Strict patient scoping: patients can only book for themselves and identity is derived from verified session
    if (req.user.role === "patient") {
      let myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient) {
        myPatient = await Patient.findOne({
          $or: [
            ...(req.user.phone ? [{ phone: req.user.phone }] : []),
            ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
          ],
        });
        if (myPatient && !myPatient.userId) {
          myPatient.userId = req.user._id;
          await myPatient.save();
        }
      }
      if (!myPatient) {
        return next(new ForbiddenError("No registered patient record linked to your account"));
      }
      effectivePatientId = myPatient._id;
    }

    if (!effectivePatientId || !doctorId || !appointmentDate || !startTime) {
      return next(new ValidationError("Patient, Doctor, Appointment Date, and Start Time are required"));
    }

    // Verify doctor exists and is active
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.status !== "active") {
      return next(new ValidationError("Selected doctor is not active or available"));
    }

    // Verify patient exists
    const patient = await Patient.findById(effectivePatientId);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    const appointment = await bookAppointmentAtomic(
      {
        patientId: effectivePatientId,
        doctorId,
        serviceName: serviceName || "General Wellness Consultation",
        appointmentDate,
        startTime,
        endTime,
        mode,
        notes,
        bookingSource,
      },
      req.user
    );

    return sendSuccess(res, { appointment }, "Appointment scheduled successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { status, cancellationReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    const validStatuses = ["scheduled", "checked_in", "in_consultation", "completed", "cancelled", "no_show"];
    if (!validStatuses.includes(status)) {
      return next(new ValidationError(`Invalid status transition to '${status}'`));
    }

    if (status === "cancelled") {
      const appointment = await cancelAppointmentAtomic(req.params.id, cancellationReason, req.user);
      return sendSuccess(res, { appointment }, `Appointment status updated to 'cancelled'`);
    }

    appointment.status = status;
    if (status === "checked_in") {
      appointment.checkedInAt = new Date();
    } else if (status === "completed") {
      appointment.completedAt = new Date();
    }

    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: `APPOINTMENT_STATUS_${status.toUpperCase()}`,
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, `Appointment status updated to '${status}'`);
  } catch (err) {
    return next(err);
  }
}

async function rescheduleAppointment(req, res, next) {
  try {
    const appointmentDate = req.body.appointmentDate || req.body.newDate;
    const startTime = req.body.startTime || req.body.newStartTime;
    const endTime = req.body.endTime || req.body.newEndTime;
    if (!appointmentDate || !startTime) {
      return next(new ValidationError("New appointment date and start time are required"));
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!myPatient || appointment.patientId.toString() !== myPatient._id.toString()) {
        return next(new ForbiddenError("Access denied: You cannot reschedule another patient's appointment"));
      }
    }

    const updatedAppointment = await rescheduleAppointmentAtomic(
      req.params.id,
      appointmentDate,
      startTime,
      endTime,
      req.user
    );

    return sendSuccess(res, { appointment: updatedAppointment }, "Appointment rescheduled successfully");
  } catch (err) {
    return next(err);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const { reason = "Patient requested cancellation" } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!myPatient || appointment.patientId.toString() !== myPatient._id.toString()) {
        return next(new ForbiddenError("Access denied: You cannot cancel another patient's appointment"));
      }
    }

    if (["cancelled", "completed"].includes(appointment.status)) {
      return next(new ValidationError(`Cannot cancel an appointment that is already ${appointment.status}`));
    }

    const cancelledAppointment = await cancelAppointmentAtomic(req.params.id, reason, req.user);

    return sendSuccess(res, { appointment: cancelledAppointment }, "Appointment cancelled successfully");
  } catch (err) {
    return next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return next(new ValidationError("Both doctorId and date (YYYY-MM-DD) are required"));
    }

    const doctor = await Doctor.findById(doctorId).populate("userId", "name");
    if (!doctor) {
      return next(new NotFoundError("Consultant not found"));
    }

    // Standard working schedule
    const allSlots = [
      { startTime: "10:00", endTime: "10:30" },
      { startTime: "10:30", endTime: "11:00" },
      { startTime: "11:00", endTime: "11:30" },
      { startTime: "11:30", endTime: "12:00" },
      { startTime: "12:00", endTime: "12:30" },
      { startTime: "12:30", endTime: "13:00" },
      { startTime: "14:00", endTime: "14:30" },
      { startTime: "14:30", endTime: "15:00" },
      { startTime: "15:00", endTime: "15:30" },
      { startTime: "15:30", endTime: "16:00" },
      { startTime: "16:00", endTime: "16:30" },
      { startTime: "16:30", endTime: "17:00" },
      { startTime: "17:00", endTime: "17:30" },
      { startTime: "17:30", endTime: "18:00" },
    ];

    // Check if Doctor has approved leave in HRMS for this date
    let isOnLeave = false;
    let leaveDetails = null;
    if (doctor.userId?._id || doctor.userId) {
      try {
        const Employee = require("../hrms/employee.model");
        const LeaveRequest = require("../hrms/leave.model");
        const employee = await Employee.findOne({ userId: doctor.userId?._id || doctor.userId });
        if (employee) {
          const reqDateObj = new Date(date);
          const dayStart = new Date(reqDateObj);
          dayStart.setUTCHours(0, 0, 0, 0);
          const dayEnd = new Date(reqDateObj);
          dayEnd.setUTCHours(23, 59, 59, 999);

          const approvedLeave = await LeaveRequest.findOne({
            employeeId: employee._id,
            status: "approved",
            startDate: { $lte: dayEnd },
            endDate: { $gte: dayStart },
          });

          if (approvedLeave) {
            isOnLeave = true;
            leaveDetails = {
              leaveType: approvedLeave.leaveType,
              reason: approvedLeave.reason,
            };
          }
        }
      } catch (err) {
        // HRMS check failure does not crash availability calculation
      }
    }

    const [bookedAppointments, reservedSlots] = await Promise.all([
      Appointment.find({
        doctorId,
        appointmentDate: date,
        status: { $in: ["scheduled", "checked_in", "in_consultation"] },
      }),
      SlotReservation.find({
        doctorId,
        appointmentDate: date,
      }),
    ]);

    const unavailableTimes = new Set([
      ...bookedAppointments.map((a) => a.startTime),
      ...reservedSlots.map((r) => r.slotTime),
    ]);

    const slots = allSlots.map((slot) => ({
      ...slot,
      isAvailable: isOnLeave ? false : !unavailableTimes.has(slot.startTime),
    }));

    return sendSuccess(
      res,
      {
        doctor: {
          _id: doctor._id,
          name: doctor.userId?.name || "Consultant",
          qualifications: doctor.qualifications,
          specialization: doctor.specialization,
          consultationFee: doctor.consultationFee,
        },
        date,
        isOnLeave,
        leaveDetails,
        totalSlots: slots.length,
        availableSlotsCount: slots.filter((s) => s.isAvailable).length,
        slots,
      },
      isOnLeave ? "Doctor is on approved leave for this date" : "Consultant slot availability computed"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  getAvailability,
};

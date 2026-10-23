const Appointment = require("./appointment.model");
const Doctor = require("../doctors/doctor.model");
const Patient = require("../patients/patient.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

// Helper to generate appointment code safely
async function generateAppointmentCode() {
  const count = await Appointment.countDocuments();
  let codeNum = 1000 + count + 1;
  while (await Appointment.exists({ appointmentCode: `TG-A-${codeNum}` })) {
    codeNum++;
  }
  return `TG-A-${codeNum}`;
}

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

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: -1, startTime: 1 })
      .populate("patientId", "fullName phone patientCode age gender")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

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

    if (!patientId || !doctorId || !appointmentDate || !startTime) {
      return next(new ValidationError("Patient, Doctor, Appointment Date, and Start Time are required"));
    }

    // Verify doctor exists and is active
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.status !== "active") {
      return next(new ValidationError("Selected doctor is not active or available"));
    }

    let effectivePatientId = patientId;

    // Strict patient scoping: patients can only book for themselves
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!myPatient) {
        return next(new ForbiddenError("No registered patient record linked to your account"));
      }
      effectivePatientId = myPatient._id;
    }

    // Verify patient exists
    const patient = await Patient.findById(effectivePatientId);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    // Concurrency conflict check: Is this doctor already booked at this date and time?
    const conflict = await Appointment.findOne({
      doctorId,
      appointmentDate,
      startTime,
      status: { $in: ["scheduled", "checked_in", "in_consultation"] },
    });

    if (conflict) {
      return next(
        new ConflictError(
          `Dr. is already booked for ${appointmentDate} at ${startTime}. Please select another time slot.`
        )
      );
    }

    const calculatedEndTime =
      endTime ||
      (() => {
        const [h, m] = startTime.split(":").map(Number);
        const endMin = (m + 30) % 60;
        const endHour = h + Math.floor((m + 30) / 60);
        return `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
      })();

    const appointmentCode = await generateAppointmentCode();

    const appointment = await Appointment.create({
      appointmentCode,
      patientId: effectivePatientId,
      doctorId,
      serviceName: serviceName || "General Wellness Consultation",
      appointmentDate,
      startTime,
      endTime: calculatedEndTime,
      mode: mode || "Online Video Consultation",
      notes: notes ? notes.trim() : "",
      bookingSource,
      status: "scheduled",
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_SCHEDULED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: {
        code: appointment.appointmentCode,
        doctor: doctorId,
        date: appointmentDate,
        time: startTime,
      },
      ipAddress: req.ip,
    });

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

    appointment.status = status;
    if (status === "checked_in") {
      appointment.checkedInAt = new Date();
    } else if (status === "completed") {
      appointment.completedAt = new Date();
    } else if (status === "cancelled") {
      appointment.cancellationReason = cancellationReason ? cancellationReason.trim() : "Cancelled by staff/patient";
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
    const { appointmentDate, startTime, endTime } = req.body;
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

    // Check conflict
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: appointment.doctorId,
      appointmentDate,
      startTime,
      status: { $in: ["scheduled", "checked_in", "in_consultation"] },
    });

    if (conflict) {
      return next(new ConflictError(`Slot is already occupied on ${appointmentDate} at ${startTime}`));
    }

    appointment.appointmentDate = appointmentDate;
    appointment.startTime = startTime;
    if (endTime) appointment.endTime = endTime;
    appointment.status = "scheduled";

    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_RESCHEDULED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { newDate: appointmentDate, newTime: startTime },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, "Appointment rescheduled successfully");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
};

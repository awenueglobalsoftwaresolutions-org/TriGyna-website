const mongoose = require("mongoose");
const Appointment = require("./appointment.model");
const SlotReservation = require("./slot-reservation.model");
const Doctor = require("../doctors/doctor.model");
const Patient = require("../patients/patient.model");
const { generateAtomicAppointmentCode } = require("../../shared/counter.service");
const { ValidationError, NotFoundError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

/**
 * Quantize a time range [startTime, endTime) into 15-minute slot blocks
 * e.g. "10:00" to "10:30" => ["10:00", "10:15"]
 * @param {string} startTime - "HH:mm"
 * @param {string} endTime - "HH:mm"
 * @returns {string[]} Array of 15-minute slot intervals
 */
function quantizeSlotIntervals(startTime, endTime) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (startMinutes >= endMinutes) {
    throw new ValidationError("Start time must be earlier than end time");
  }

  const intervals = [];
  for (let m = startMinutes; m < endMinutes; m += 15) {
    const hour = Math.floor(m / 60);
    const minute = m % 60;
    intervals.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return intervals;
}

/**
 * Calculate default 30-minute end time if none provided
 */
function calculateDefaultEndTime(startTime) {
  const [h, m] = startTime.split(":").map(Number);
  const endMin = (m + 30) % 60;
  const endHour = h + Math.floor((m + 30) / 60);
  return `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
}

/**
 * Concurrency-Safe Appointment Booking
 * Atomically claims slot slices via unique database constraint before creating appointment.
 */
async function bookAppointmentAtomic(bookingData, actor) {
  const {
    patientId,
    doctorId,
    serviceName = "Skin & Hair",
    appointmentDate,
    startTime,
    endTime,
    mode,
    notes,
    bookingSource = "portal",
    paymentStatus = "unpaid",
  } = bookingData;

  if (!patientId || !doctorId || !appointmentDate || !startTime) {
    throw new ValidationError("Patient, Doctor, Appointment Date, and Start Time are required");
  }

  // 1. Verify Doctor exists and is active
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || doctor.status !== "active") {
    throw new ValidationError("Selected doctor is not active or available");
  }

  // 1b. Check if Doctor is on approved HRMS leave on the requested date
  if (doctor.userId) {
    try {
      const Employee = mongoose.models.Employee || require("../hrms/employee.model");
      const LeaveRequest = mongoose.models.LeaveRequest || require("../hrms/leave.model");
      const employee = await Employee.findOne({ userId: doctor.userId });
      if (employee) {
        const apptDateObj = new Date(appointmentDate);
        const dayStart = new Date(apptDateObj);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(apptDateObj);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const onLeave = await LeaveRequest.findOne({
          employeeId: employee._id,
          status: "approved",
          startDate: { $lte: dayEnd },
          endDate: { $gte: dayStart },
        });

        if (onLeave) {
          throw new ConflictError(`Doctor is on approved leave (${onLeave.leaveType}) on ${appointmentDate}`);
        }
      }
    } catch (leaveErr) {
      if (leaveErr instanceof ConflictError || leaveErr instanceof ValidationError) throw leaveErr;
    }
  }

  // 2. Verify Patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  const calculatedEndTime = endTime || calculateDefaultEndTime(startTime);
  const slotIntervals = quantizeSlotIntervals(startTime, calculatedEndTime);

  // 3. Pre-generate Appointment ObjectId
  const appointmentId = new mongoose.Types.ObjectId();

  const slotDocs = slotIntervals.map((slotTime) => ({
    doctorId,
    appointmentDate,
    slotTime,
    appointmentId,
    patientId,
    status: "confirmed",
  }));

  // 4. Atomically claim slot intervals using database-level unique index
  try {
    await SlotReservation.insertMany(slotDocs, { ordered: true });
  } catch (err) {
    // Rollback any partially inserted slots in this batch
    await SlotReservation.deleteMany({ appointmentId });

    if (err.code === 11000 || (err.writeErrors && err.writeErrors.some((e) => e.code === 11000))) {
      throw new ConflictError(
        `Doctor is already booked for the requested interval (${startTime} - ${calculatedEndTime}) on ${appointmentDate}. Please choose another time slot.`
      );
    }
    throw err;
  }

  // 5. Create Appointment Record
  try {
    const appointmentCode = await generateAtomicAppointmentCode();

    let normalizedMode = "Online Video Consultation";
    if (mode && (mode.toLowerCase().includes("clinic") || mode.toLowerCase().includes("person"))) {
      normalizedMode = "In-Clinic Consultation";
    }

    const appointment = await Appointment.create({
      _id: appointmentId,
      appointmentCode,
      patientId,
      doctorId,
      serviceName,
      appointmentDate,
      startTime,
      endTime: calculatedEndTime,
      mode: normalizedMode,
      status: "scheduled",
      notes: notes ? notes.trim() : "",
      bookingSource,
      paymentStatus,
    });

    if (actor) {
      await recordAudit({
        actorId: actor._id,
        actorRole: actor.role,
        action: "APPOINTMENT_BOOKED_ATOMIC",
        targetEntity: "Appointment",
        targetId: appointment._id.toString(),
        details: { appointmentCode, appointmentDate, startTime, doctorId: doctorId.toString() },
      });
    }

    return appointment;
  } catch (appErr) {
    // If appointment creation failed, release the claimed slots immediately
    await SlotReservation.deleteMany({ appointmentId });
    throw appErr;
  }
}

/**
 * Concurrency-Safe Appointment Rescheduling
 */
async function rescheduleAppointmentAtomic(appointmentId, newDate, newStartTime, newEndTime, actor) {
  if (!newDate || !newStartTime) {
    throw new ValidationError("New appointment date and start time are required");
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  if (["completed", "cancelled"].includes(appointment.status)) {
    throw new ValidationError(`Cannot reschedule an appointment that is already ${appointment.status}`);
  }

  // Check if Doctor is on approved HRMS leave on the new date
  const doctor = await Doctor.findById(appointment.doctorId);
  if (doctor && doctor.userId) {
    try {
      const Employee = mongoose.models.Employee || require("../hrms/employee.model");
      const LeaveRequest = mongoose.models.LeaveRequest || require("../hrms/leave.model");
      const employee = await Employee.findOne({ userId: doctor.userId });
      if (employee) {
        const apptDateObj = new Date(newDate);
        const dayStart = new Date(apptDateObj);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(apptDateObj);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const onLeave = await LeaveRequest.findOne({
          employeeId: employee._id,
          status: "approved",
          startDate: { $lte: dayEnd },
          endDate: { $gte: dayStart },
        });

        if (onLeave) {
          throw new ConflictError(`Doctor is on approved leave (${onLeave.leaveType}) on ${newDate}`);
        }
      }
    } catch (leaveErr) {
      if (leaveErr instanceof ConflictError || leaveErr instanceof ValidationError) throw leaveErr;
    }
  }

  const calculatedEndTime = newEndTime || calculateDefaultEndTime(newStartTime);
  const newIntervals = quantizeSlotIntervals(newStartTime, calculatedEndTime);

  // 1. Identify and claim only new slots not already held by this appointment
  const currentSlots = await SlotReservation.find({
    appointmentId: appointment._id,
    appointmentDate: newDate,
  });
  const currentHeldTimes = new Set(currentSlots.map((s) => s.slotTime));
  const slotsToAcquire = newIntervals.filter((slotTime) => !currentHeldTimes.has(slotTime));

  if (slotsToAcquire.length > 0) {
    const newSlotDocs = slotsToAcquire.map((slotTime) => ({
      doctorId: appointment.doctorId,
      appointmentDate: newDate,
      slotTime,
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      status: "confirmed",
    }));

    try {
      await SlotReservation.insertMany(newSlotDocs, { ordered: true });
    } catch (err) {
      // If new slots conflict, clean up any partial from this attempt and reject
      await SlotReservation.deleteMany({
        appointmentId: appointment._id,
        appointmentDate: newDate,
        slotTime: { $in: slotsToAcquire },
      });

      if (err.code === 11000 || (err.writeErrors && err.writeErrors.some((e) => e.code === 11000))) {
        throw new ConflictError(
          `Doctor is already booked for the requested interval (${newStartTime} - ${calculatedEndTime}) on ${newDate}.`
        );
      }
      throw err;
    }
  }

  // 2. Remove previous slot reservations for the old date/times
  await SlotReservation.deleteMany({
    appointmentId: appointment._id,
    $or: [
      { appointmentDate: { $ne: newDate } },
      { slotTime: { $nin: newIntervals } },
    ],
  });

  // 3. Update appointment
  const oldDate = appointment.appointmentDate;
  const oldTime = appointment.startTime;

  appointment.appointmentDate = newDate;
  appointment.startTime = newStartTime;
  appointment.endTime = calculatedEndTime;
  appointment.status = "scheduled";
  await appointment.save();

  if (actor) {
    await recordAudit({
      actorId: actor._id,
      actorRole: actor.role,
      action: "APPOINTMENT_RESCHEDULED_ATOMIC",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { oldDate, oldTime, newDate, newStartTime },
    });
  }

  return appointment;
}

/**
 * Concurrency-Safe Appointment Cancellation
 * Releases slot reservations so the time slot becomes immediately available for other bookings.
 */
async function cancelAppointmentAtomic(appointmentId, cancellationReason, actor) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  appointment.status = "cancelled";
  appointment.cancellationReason = cancellationReason ? cancellationReason.trim() : "Cancelled by staff/patient";
  await appointment.save();

  // Release all slot reservations for this appointment
  await SlotReservation.deleteMany({ appointmentId: appointment._id });

  if (actor) {
    await recordAudit({
      actorId: actor._id,
      actorRole: actor.role,
      action: "APPOINTMENT_CANCELLED_ATOMIC",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { cancellationReason: appointment.cancellationReason },
    });
  }

  return appointment;
}

module.exports = {
  quantizeSlotIntervals,
  calculateDefaultEndTime,
  bookAppointmentAtomic,
  rescheduleAppointmentAtomic,
  cancelAppointmentAtomic,
};

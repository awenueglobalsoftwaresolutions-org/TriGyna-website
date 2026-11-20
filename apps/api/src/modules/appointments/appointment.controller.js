const Appointment = require("./appointment.model");
const Doctor = require("../doctors/doctor.model");
const Patient = require("../patients/patient.model");
const User = require("../users/user.model");
const SlotReservation = require("./slot-reservation.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { dispatchNotificationEvent } = require("../notifications/notification.service");

const { generateAtomicAppointmentCode } = require("../../shared/counter.service");
const {
  bookAppointmentAtomic,
  rescheduleAppointmentAtomic,
  cancelAppointmentAtomic,
} = require("./booking.service");
const { consumeSessionCredit } = require("../packages/session-ledger.service");

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

    // 100% Online-only Consultation enforcement
    if (mode && (mode.toLowerCase().includes("clinic") || mode.toLowerCase().includes("person") || mode.toLowerCase().includes("offline"))) {
      return next(
        new ValidationError("TriGyna operates exclusively as an Online Video Healthcare platform. In-clinic consultations are not supported.")
      );
    }

    // Verify doctor exists and is active
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.status !== "active") {
      return next(new ValidationError("Selected doctor is not active or available"));
    }

    // Doctor credential verification gate
    if (doctor.isVerified === false || (doctor.verificationStatus && doctor.verificationStatus !== "verified")) {
      return next(
        new ValidationError(
          "Doctor's professional medical registration credentials are pending verification by administration. Clinical appointments cannot be scheduled until verified."
        )
      );
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
      try {
        await consumeSessionCredit({
          patientId: appointment.patientId,
          appointmentId: appointment._id,
          actor: req.user,
        });
      } catch (creditErr) {
        console.warn("[Appointment] Credit consumption note:", creditErr.message);
      }
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

    // Gate: Doctor credentials verification check
    if (doctor.isVerified === false || (doctor.verificationStatus && doctor.verificationStatus !== "verified")) {
      return sendSuccess(
        res,
        {
          doctor: {
            _id: doctor._id,
            name: doctor.userId?.name || "Consultant",
            qualifications: doctor.qualifications,
            specialization: doctor.specialization,
            consultationFee: doctor.consultationFee,
            verificationStatus: doctor.verificationStatus || "pending",
          },
          date,
          isOnLeave: false,
          verificationPending: true,
          totalSlots: 0,
          availableSlotsCount: 0,
          slots: [],
        },
        "Doctor's professional medical registration credentials are pending verification by administration"
      );
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

/**
 * Validate Google Meet or Zoom URL format and domain integrity
 */
function validateMeetingUrl(provider, url) {
  if (!url || typeof url !== "string") {
    throw new ValidationError("Meeting URL is required");
  }
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch (e) {
    throw new ValidationError("Invalid URL format. Must be a valid HTTPS URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new ValidationError("Meeting URL must use secure HTTPS protocol");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (provider === "google_meet") {
    if (hostname !== "meet.google.com") {
      throw new ValidationError("Invalid Google Meet domain. URL must begin with https://meet.google.com/");
    }
    if (parsed.pathname.length < 4) {
      throw new ValidationError("Google Meet URL is missing meeting code");
    }
  } else if (provider === "zoom") {
    if (!hostname.endsWith(".zoom.us") && hostname !== "zoom.us") {
      throw new ValidationError("Invalid Zoom domain. URL must be a valid https://*.zoom.us meeting link");
    }
    if (!parsed.pathname.includes("/j/") && !parsed.pathname.includes("/my/")) {
      throw new ValidationError("Zoom URL does not appear to be a valid meeting join URL");
    }
  } else {
    throw new ValidationError("Provider must be either 'google_meet' or 'zoom'");
  }
  return parsed.toString();
}

/**
 * PUT /api/v1/appointments/:id/meeting-link
 * Allows assigned Doctor or Admin/Owner to attach or update Google Meet / Zoom meeting link.
 */
async function updateMeetingLink(req, res, next) {
  try {
    const { id } = req.params;
    const { provider, meetingLink } = req.body;

    const appointment = await Appointment.findById(id).populate("patientId");
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    // Role check: Only assigned doctor or admin/owner can update
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return next(new ForbiddenError("Access denied: You are not assigned to this appointment"));
      }
    } else if (!["owner", "admin", "super_admin"].includes(req.user.role)) {
      return next(new ForbiddenError("Access denied: Insufficient privileges to update meeting link"));
    }

    let cleanUrl = "";
    let cleanProvider = "none";
    let status = "pending";

    if (meetingLink && meetingLink.trim()) {
      cleanProvider = provider || (meetingLink.includes("meet.google.com") ? "google_meet" : "zoom");
      cleanUrl = validateMeetingUrl(cleanProvider, meetingLink);
      status = "ready";
    }

    const previousLink = appointment.meetingLink;
    appointment.meetingProvider = cleanProvider;
    appointment.meetingLink = cleanUrl;
    appointment.meetingStatus = status;
    appointment.meetingAddedBy = req.user._id;
    if (!appointment.meetingAddedAt && cleanUrl) {
      appointment.meetingAddedAt = new Date();
    }
    appointment.meetingUpdatedAt = new Date();

    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_MEETING_LINK_UPDATED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: {
        provider: cleanProvider,
        status,
        previousLink: previousLink ? "[REDACTED]" : "none",
      },
      ipAddress: req.ip,
    });

    // Dispatch notification to patient if new valid link provided
    if (cleanUrl) {
      const patient = appointment.patientId;
      const patientUser = patient?.userId ? await User.findById(patient.userId) : null;
      const doctor = await Doctor.findById(appointment.doctorId).populate("userId");
      const doctorName = doctor?.userId?.name || "Dr. TriGyna";

      await dispatchNotificationEvent("appointment.meeting_link_updated", {
        appointment,
        doctorName,
        patientUser,
      });
    }

    return sendSuccess(
      res,
      {
        appointmentId: appointment._id,
        meetingProvider: appointment.meetingProvider,
        meetingLink: appointment.meetingLink,
        meetingStatus: appointment.meetingStatus,
        meetingUpdatedAt: appointment.meetingUpdatedAt,
      },
      cleanUrl ? "Meeting link updated and patient notified successfully" : "Meeting link cleared"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/appointments/:id/meeting-details
 * Retrieve authorized video meeting link for doctor, owner, or owning patient
 */
async function getMeetingDetails(req, res, next) {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate("patientId", "fullName phone patientCode userId")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    // Role check
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || appointment.patientId?._id?.toString() !== myPatient._id.toString()) {
        return next(new ForbiddenError("Access denied: You do not own this appointment"));
      }
    } else if (req.user.role === "doctor") {
      const myDoctor = await Doctor.findOne({ userId: req.user._id });
      if (!myDoctor || appointment.doctorId?._id?.toString() !== myDoctor._id.toString()) {
        return next(new ForbiddenError("Access denied: You are not assigned to this appointment"));
      }
    } else if (!["owner", "admin", "super_admin"].includes(req.user.role)) {
      return next(new ForbiddenError("Access denied"));
    }

    return sendSuccess(
      res,
      {
        appointmentId: appointment._id,
        appointmentCode: appointment.appointmentCode,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        mode: appointment.mode,
        doctorName: appointment.doctorId?.userId?.name || "Consultant",
        patientName: appointment.patientId?.fullName || "Patient",
        meetingProvider: appointment.meetingProvider,
        meetingLink: appointment.meetingLink || null,
        meetingStatus: appointment.meetingStatus,
        meetingUpdatedAt: appointment.meetingUpdatedAt,
      },
      "Meeting details retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/appointments/stats
 * Aggregated KPIs for Appointments Dashboard based on real MongoDB records
 */
async function getAppointmentStats(req, res, next) {
  try {
    const today = req.query.date || new Date().toISOString().split("T")[0];
    const currentMonthPrefix = today.slice(0, 7); // e.g. "2026-10"

    const [
      totalAppointments,
      todayAppointments,
      todayCompleted,
      todayUpcoming,
      todayInConsultation,
      todayCancelled,
      completedThisMonth,
      cancelledOrNoShow,
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ appointmentDate: today }),
      Appointment.countDocuments({ appointmentDate: today, status: "completed" }),
      Appointment.countDocuments({ appointmentDate: today, status: { $in: ["scheduled", "checked_in"] } }),
      Appointment.countDocuments({ appointmentDate: today, status: { $in: ["in_consultation", "checked_in"] } }),
      Appointment.countDocuments({ appointmentDate: today, status: { $in: ["cancelled", "no_show"] } }),
      Appointment.countDocuments({
        appointmentDate: { $regex: `^${currentMonthPrefix}` },
        status: "completed",
      }),
      Appointment.countDocuments({
        status: { $in: ["cancelled", "no_show"] },
      }),
    ]);

    const activeInConsultationTotal = await Appointment.countDocuments({
      status: "in_consultation",
    });

    const totalToday = todayAppointments || (todayCompleted + todayInConsultation + todayUpcoming + todayCancelled);
    const denom = totalToday > 0 ? totalToday : 1;

    const distribution = {
      total: totalToday,
      completed: {
        count: todayCompleted,
        percentage: Math.round((todayCompleted / denom) * 100),
      },
      inConsultation: {
        count: todayInConsultation,
        percentage: Math.round((todayInConsultation / denom) * 100),
      },
      upcoming: {
        count: todayUpcoming,
        percentage: Math.round((todayUpcoming / denom) * 100),
      },
      cancelled: {
        count: todayCancelled,
        percentage: Math.round((todayCancelled / denom) * 100),
      },
    };

    return sendSuccess(
      res,
      {
        totalAppointments,
        todayAppointments: {
          count: totalToday,
          completed: todayCompleted,
          upcoming: todayUpcoming,
        },
        inConsultation: activeInConsultationTotal,
        completedThisMonth,
        cancelledOrNoShow,
        distribution,
        date: today,
      },
      "Appointment statistics retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/appointments/calendar
 * Multi-doctor daily schedule grid data with populated patients and doctors
 */
async function getCalendarData(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const { doctorId, serviceName, status } = req.query;

    const doctorQuery = { status: "active" };
    if (doctorId && doctorId !== "all") doctorQuery._id = doctorId;

    const rawDoctors = await Doctor.find(doctorQuery)
      .populate("userId", "name email phone")
      .lean();

    // Deduplicate distinct practitioners by name/userId
    const seenNames = new Set();
    const uniqueDoctors = [];
    for (const d of rawDoctors) {
      const name = d.userId?.name;
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        uniqueDoctors.push(d);
      }
    }

    const apptQuery = { appointmentDate: date };
    if (doctorId && doctorId !== "all") apptQuery.doctorId = doctorId;
    if (serviceName && serviceName !== "all") apptQuery.serviceName = serviceName;
    if (status && status !== "all") apptQuery.status = status;

    const appointments = await Appointment.find(apptQuery)
      .populate("patientId", "fullName phone patientCode age gender")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ startTime: 1 })
      .lean();

    // Prioritize doctors with scheduled appointments on this date
    const doctorIdsWithAppts = new Set(
      appointments.map((a) => (a.doctorId?._id ? a.doctorId._id.toString() : ""))
    );

    uniqueDoctors.sort((a, b) => {
      const aHas = doctorIdsWithAppts.has(a._id.toString()) ? 1 : 0;
      const bHas = doctorIdsWithAppts.has(b._id.toString()) ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return (a.userId?.name || "").localeCompare(b.userId?.name || "");
    });

    const activeColumnDoctors = uniqueDoctors.slice(0, 4);

    return sendSuccess(
      res,
      {
        date,
        doctors: activeColumnDoctors.map((d) => ({
          _id: d._id,
          name: d.userId?.name || "Dr. TriGyna",
          specialization: Array.isArray(d.specialization) ? d.specialization[0] : (d.specialization || "General Physician"),
          allSpecializations: d.specialization,
          consultationFee: d.consultationFee,
          workingHours: d.workingHours,
        })),
        allDoctors: uniqueDoctors.map((d) => ({
          _id: d._id,
          name: d.userId?.name || "Dr. TriGyna",
          specialization: Array.isArray(d.specialization) ? d.specialization[0] : (d.specialization || "General Physician"),
        })),
        appointments,
        totalCount: appointments.length,
      },
      "Calendar data retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/appointments/:id/check-in
 */
async function checkInAppointment(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return next(new NotFoundError("Appointment not found"));

    appointment.status = "checked_in";
    appointment.checkedInAt = new Date();
    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_CHECKED_IN",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { appointmentCode: appointment.appointmentCode },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, "Patient checked in successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/appointments/:id/start-consultation
 */
async function startConsultation(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return next(new NotFoundError("Appointment not found"));

    appointment.status = "in_consultation";
    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_START_CONSULTATION",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { appointmentCode: appointment.appointmentCode },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, "Consultation session started");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/appointments/:id/complete
 */
async function completeAppointment(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return next(new NotFoundError("Appointment not found"));

    appointment.status = "completed";
    appointment.completedAt = new Date();
    await appointment.save();

    try {
      await consumeSessionCredit({
        patientId: appointment.patientId,
        appointmentId: appointment._id,
        actor: req.user,
      });
    } catch (creditErr) {
      console.warn("[Appointment] Credit consumption note:", creditErr.message);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_COMPLETED",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { appointmentCode: appointment.appointmentCode },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, "Appointment marked as completed");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/appointments/:id/no-show
 */
async function markNoShow(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return next(new NotFoundError("Appointment not found"));

    appointment.status = "no_show";
    await appointment.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "APPOINTMENT_NO_SHOW",
      targetEntity: "Appointment",
      targetId: appointment._id.toString(),
      details: { appointmentCode: appointment.appointmentCode },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { appointment }, "Appointment marked as no show");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/appointments/export
 * Export appointments in CSV format respecting filters
 */
async function exportAppointmentsCsv(req, res, next) {
  try {
    const { date, doctorId, status } = req.query;
    const query = {};
    if (date) query.appointmentDate = date;
    if (doctorId && doctorId !== "all") query.doctorId = doctorId;
    if (status && status !== "all") query.status = status;

    const appointments = await Appointment.find(query)
      .populate("patientId", "fullName phone patientCode")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ appointmentDate: -1, startTime: 1 })
      .limit(1000)
      .lean();

    const headers = [
      "Appointment Code",
      "Date",
      "Time",
      "Patient Name",
      "Patient Phone",
      "Patient Code",
      "Doctor",
      "Service",
      "Mode",
      "Status",
      "Payment Status",
      "Meeting Link",
    ];

    const rows = appointments.map((a) => [
      `"${a.appointmentCode || ""}"`,
      `"${a.appointmentDate || ""}"`,
      `"${a.startTime || ""} - ${a.endTime || ""}"`,
      `"${(a.patientId?.fullName || "").replace(/"/g, '""')}"`,
      `"${a.patientId?.phone || ""}"`,
      `"${a.patientId?.patientCode || ""}"`,
      `"${(a.doctorId?.userId?.name || "").replace(/"/g, '""')}"`,
      `"${(a.serviceName || "").replace(/"/g, '""')}"`,
      `"${a.mode || ""}"`,
      `"${a.status || ""}"`,
      `"${a.paymentStatus || ""}"`,
      `"${a.meetingLink || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="trigyna-appointments-${date || "export"}.csv"`);
    return res.status(200).send(csvContent);
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
  updateMeetingLink,
  getMeetingDetails,
  getAppointmentStats,
  getCalendarData,
  checkInAppointment,
  startConsultation,
  completeAppointment,
  markNoShow,
  exportAppointmentsCsv,
};

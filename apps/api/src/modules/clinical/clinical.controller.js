const Consultation = require("./consultation.model");
const Prescription = require("./prescription.model");
const Appointment = require("../appointments/appointment.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

async function getConsultationByAppointment(req, res, next) {
  try {
    const { appointmentId } = req.params;
    let consultation = await Consultation.findOne({ appointmentId })
      .populate("doctorId", "qualifications specialization")
      .populate("patientId", "fullName phone patientCode age gender allergies medicalHistory")
      .populate("amendments.amendedBy", "name role");

    // If it doesn't exist yet, we fetch appointment details so doctor can start
    if (!consultation) {
      const appointment = await Appointment.findById(appointmentId)
        .populate("patientId", "fullName phone patientCode age gender allergies medicalHistory")
        .populate("doctorId");

      if (!appointment) {
        return next(new NotFoundError("Appointment not found"));
      }

      return sendSuccess(res, { consultation: null, appointment }, "No draft found; ready for new consultation");
    }

    // Role check: Patient can only view finalized records
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || consultation.patientId._id.toString() !== myPatient._id.toString()) {
        return next(new ForbiddenError("Unauthorized access to patient consultation"));
      }
      if (!consultation.isFinalized) {
        return sendSuccess(res, { consultation: null }, "Consultation is currently in progress");
      }
    }

    return sendSuccess(res, { consultation }, "Consultation retrieved");
  } catch (err) {
    return next(err);
  }
}

async function saveConsultationDraft(req, res, next) {
  try {
    const { appointmentId, chiefComplaints, examinationNotes, diagnosis, treatmentPlan, followUpAdvice } = req.body;

    if (!appointmentId) {
      return next(new ValidationError("Appointment ID is required"));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return next(new NotFoundError("Appointment not found"));
    }

    let consultation = await Consultation.findOne({ appointmentId });

    if (consultation && consultation.isFinalized) {
      return next(
        new ConflictError("This consultation has already been finalized and locked. Use the amendment workflow to append corrections.")
      );
    }

    if (!consultation) {
      consultation = await Consultation.create({
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        chiefComplaints,
        examinationNotes,
        diagnosis,
        treatmentPlan,
        followUpAdvice,
        isFinalized: false,
      });
      // Move appointment status to in_consultation if scheduled
      if (appointment.status === "scheduled" || appointment.status === "checked_in") {
        appointment.status = "in_consultation";
        await appointment.save();
      }
    } else {
      if (chiefComplaints !== undefined) consultation.chiefComplaints = chiefComplaints;
      if (examinationNotes !== undefined) consultation.examinationNotes = examinationNotes;
      if (diagnosis !== undefined) consultation.diagnosis = diagnosis;
      if (treatmentPlan !== undefined) consultation.treatmentPlan = treatmentPlan;
      if (followUpAdvice !== undefined) consultation.followUpAdvice = followUpAdvice;
      await consultation.save();
    }

    return sendSuccess(res, { consultation }, "Consultation draft saved");
  } catch (err) {
    return next(err);
  }
}

async function finalizeConsultation(req, res, next) {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    if (consultation.isFinalized) {
      return next(new ConflictError("Consultation is already finalized"));
    }

    consultation.isFinalized = true;
    consultation.finalizedAt = new Date();
    await consultation.save();

    // Mark appointment completed
    await Appointment.findByIdAndUpdate(consultation.appointmentId, {
      status: "completed",
      completedAt: new Date(),
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONSULTATION_FINALIZED",
      targetEntity: "Consultation",
      targetId: consultation._id.toString(),
      details: { patientId: consultation.patientId },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { consultation }, "Consultation successfully finalized and locked");
  } catch (err) {
    return next(err);
  }
}

async function amendConsultation(req, res, next) {
  try {
    const { reason, newDiagnosis, newTreatmentPlan } = req.body;
    if (!reason || !reason.trim()) {
      return next(new ValidationError("A documented reason is mandatory for clinical amendments"));
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    consultation.amendments.push({
      amendedAt: new Date(),
      amendedBy: req.user._id,
      reason: reason.trim(),
      previousDiagnosis: consultation.diagnosis,
      previousTreatmentPlan: consultation.treatmentPlan,
    });

    if (newDiagnosis) consultation.diagnosis = newDiagnosis;
    if (newTreatmentPlan) consultation.treatmentPlan = newTreatmentPlan;

    await consultation.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONSULTATION_AMENDED",
      targetEntity: "Consultation",
      targetId: consultation._id.toString(),
      details: { reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { consultation }, "Clinical amendment recorded successfully");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Prescriptions -----------------
async function savePrescription(req, res, next) {
  try {
    const { consultationId, medications, dietaryAdvice, specialInstructions, isReleasedToPatient = true } = req.body;

    if (!consultationId) {
      return next(new ValidationError("Consultation ID is required"));
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    let prescription = await Prescription.findOne({ consultationId });

    if (!prescription) {
      prescription = await Prescription.create({
        consultationId,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        medications: Array.isArray(medications) ? medications : [],
        dietaryAdvice: dietaryAdvice || "",
        specialInstructions: specialInstructions || "",
        isReleasedToPatient,
      });
    } else {
      if (medications) prescription.medications = medications;
      if (dietaryAdvice !== undefined) prescription.dietaryAdvice = dietaryAdvice;
      if (specialInstructions !== undefined) prescription.specialInstructions = specialInstructions;
      if (isReleasedToPatient !== undefined) prescription.isReleasedToPatient = isReleasedToPatient;
      await prescription.save();
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PRESCRIPTION_SAVED",
      targetEntity: "Prescription",
      targetId: prescription._id.toString(),
      ipAddress: req.ip,
    });

    return sendSuccess(res, { prescription }, "Prescription saved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getPrescriptionsForPatient(req, res, next) {
  try {
    const { patientId } = req.params;

    // Security check for patient role
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient || myPatient._id.toString() !== patientId) {
        return next(new ForbiddenError("Unauthorized access to prescriptions"));
      }
    }

    const query = { patientId };
    if (req.user.role === "patient") {
      query.isReleasedToPatient = true;
    }

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .populate("doctorId", "qualifications")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      });

    return sendSuccess(res, { prescriptions, count: prescriptions.length }, "Prescriptions retrieved");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getConsultationByAppointment,
  saveConsultationDraft,
  finalizeConsultation,
  amendConsultation,
  savePrescription,
  getPrescriptionsForPatient,
};

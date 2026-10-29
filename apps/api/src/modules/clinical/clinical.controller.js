const Consultation = require("./consultation.model");
const Prescription = require("./prescription.model");
const Appointment = require("../appointments/appointment.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { generateAtomicPrescriptionCode } = require("../../shared/counter.service");

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

      // Check role authorization on appointment details
      if (req.user.role === "patient") {
        const myPatient = await Patient.findOne({ userId: req.user._id });
        if (!myPatient || appointment.patientId._id.toString() !== myPatient._id.toString()) {
          return next(new ForbiddenError("Unauthorized access to appointment details"));
        }
      } else if (req.user.role === "doctor") {
        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor || (appointment.doctorId && appointment.doctorId._id.toString() !== doctor._id.toString())) {
          return next(new ForbiddenError("Access denied: You are not assigned to this appointment"));
        }
      } else if (req.user.role !== "owner" && req.user.role !== "admin" && req.user.role !== "super_admin") {
        return next(new ForbiddenError("Access denied: Insufficient privileges to view clinical draft"));
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
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found for authenticated user"));
      }
      const isAssignedDoctor = consultation.doctorId && consultation.doctorId._id.toString() === doctor._id.toString();
      const hasClinicalRel = await Appointment.exists({ doctorId: doctor._id, patientId: consultation.patientId._id });
      if (!isAssignedDoctor && !hasClinicalRel) {
        return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this consultation"));
      }
    } else if (req.user.role !== "owner" && req.user.role !== "admin" && req.user.role !== "super_admin") {
      return next(new ForbiddenError("Access denied: Insufficient privileges to view clinical records"));
    }

    let resultConsultation = consultation;
    if (req.user.role === "patient" && consultation) {
      resultConsultation = consultation.toObject ? consultation.toObject() : { ...consultation };
      delete resultConsultation.examinationNotes;
    }

    return sendSuccess(res, { consultation: resultConsultation }, "Consultation retrieved");
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
      const prescriptionCode = await generateAtomicPrescriptionCode();
      prescription = await Prescription.create({
        prescriptionCode,
        consultationId,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        medications: Array.isArray(medications) ? medications : [],
        dietaryAdvice: dietaryAdvice || "",
        specialInstructions: specialInstructions || "",
        isReleasedToPatient,
      });
    } else {
      if (!prescription.prescriptionCode) {
        prescription.prescriptionCode = await generateAtomicPrescriptionCode();
      }
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
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found for authenticated user"));
      }
      const [hasAppt, hasRx, isAssigned] = await Promise.all([
        Appointment.exists({ doctorId: doctor._id, patientId }),
        Prescription.exists({ doctorId: doctor._id, patientId }),
        Patient.exists({ _id: patientId, assignedDoctorId: doctor._id }),
      ]);
      if (!hasAppt && !hasRx && !isAssigned) {
        return next(new ForbiddenError("Access denied: You do not have an authorized clinical relationship with this patient"));
      }
    } else if (req.user.role !== "owner" && req.user.role !== "admin" && req.user.role !== "super_admin") {
      return next(new ForbiddenError("Access denied: Insufficient privileges to view patient prescriptions"));
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

const { canAccessConsultation } = require("../auth/authorization.service");

async function getConsultationById(req, res, next) {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findById(id)
      .populate("patientId", "fullName phone patientCode age gender allergies medicalHistory")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("appointmentId", "appointmentCode appointmentDate startTime mode")
      .populate("amendments.amendedBy", "name role");

    if (!consultation) {
      return next(new NotFoundError("Consultation not found"));
    }

    const allowed = await canAccessConsultation(req.user, consultation);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You do not have permission to view this consultation"));
    }

    let resultConsultation = consultation;
    if (req.user.role === "patient" && consultation) {
      resultConsultation = consultation.toObject ? consultation.toObject() : { ...consultation };
      delete resultConsultation.examinationNotes;
    }

    return sendSuccess(res, { consultation: resultConsultation }, "Consultation retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function listConsultations(req, res, next) {
  try {
    const { patientId, doctorId, page = 1, limit = 50 } = req.query;
    const query = {};

    // 1. Role validation
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found for authenticated user"));
      }

      // Never trust client doctorId; enforce doctor identity from auth context
      if (doctorId && doctorId.toString() !== doctor._id.toString()) {
        return next(new ForbiddenError("Access denied: You cannot query consultations of another doctor"));
      }
      query.doctorId = doctor._id;

      // If patientId is requested, verify authorized clinical relationship exists
      if (patientId) {
        const hasRel = await Appointment.exists({ doctorId: doctor._id, patientId });
        const hasConsult = await Consultation.exists({ doctorId: doctor._id, patientId });
        const isAssigned = await Patient.exists({ _id: patientId, assignedDoctorId: doctor._id });
        if (!hasRel && !hasConsult && !isAssigned) {
          return next(new ForbiddenError("Access denied: No authorized clinical relationship with this patient"));
        }
        query.patientId = patientId;
      }
    } else if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return sendSuccess(res, { consultations: [], total: 0, count: 0 }, "No linked patient chart");
      }
      if (patientId && patientId.toString() !== patient._id.toString()) {
        return next(new ForbiddenError("Access denied: You can only view your own consultations"));
      }
      query.patientId = patient._id;
      query.isFinalized = true; // Patients only see finalized notes
    } else if (["owner", "super_admin", "admin"].includes(req.user.role)) {
      if (doctorId) query.doctorId = doctorId;
      if (patientId) query.patientId = patientId;
    } else {
      return next(new ForbiddenError("Access denied: Insufficient privileges to view clinical records"));
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let consultQuery = Consultation.find(query);
    if (req.user.role === "patient") {
      consultQuery = consultQuery.select("-examinationNotes");
    }

    const [consultations, total] = await Promise.all([
      consultQuery
        .populate("patientId", "fullName phone patientCode age gender")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId", "appointmentCode appointmentDate startTime mode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Consultation.countDocuments(query),
    ]);

    return sendSuccess(
      res,
      { consultations, total, count: consultations.length, page: parseInt(page, 10) },
      "Consultations retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listConsultations,
  getConsultationById,
  getConsultationByAppointment,
  saveConsultationDraft,
  finalizeConsultation,
  amendConsultation,
  savePrescription,
  getPrescriptionsForPatient,
};

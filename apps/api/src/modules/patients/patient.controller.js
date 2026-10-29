const Patient = require("./patient.model");
const Appointment = require("../appointments/appointment.model");
const Invoice = require("../billing/invoice.model");
const Lead = require("../crm/lead.model");
const Consultation = require("../clinical/consultation.model");
const Prescription = require("../clinical/prescription.model");
const FollowUp = require("../clinical/followup.model");
const PatientDocument = require("./document.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");


const { generateAtomicPatientCode } = require("../../shared/counter.service");

const { canAccessPatient, serializePatientForRole } = require("../auth/authorization.service");
const Doctor = require("../doctors/doctor.model");

async function listPatients(req, res, next) {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const query = {};

    // 1. HRMS staff are strictly forbidden from accessing patient records
    if (req.user.role === "hrms") {
      return next(new ForbiddenError("HRMS personnel are not authorized to view patient clinical records"));
    }

    // 2. Patient role can only access their own linked record
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient) {
        return sendSuccess(res, { patients: [], total: 0 }, "No patient profile linked");
      }
      return sendSuccess(res, { patients: [myPatient], total: 1 }, "Patient profile retrieved");
    }

    // 3. Doctor role: can only list patients with an authorized clinical relationship or assignment
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found for authenticated user"));
      }
      const [apptPatientIds, consultPatientIds] = await Promise.all([
        Appointment.distinct("patientId", { doctorId: doctor._id }),
        Consultation.distinct("patientId", { doctorId: doctor._id }),
      ]);
      const authorizedPatientIds = [
        ...new Set([
          ...apptPatientIds.map((id) => id.toString()),
          ...consultPatientIds.map((id) => id.toString()),
        ]),
      ];
      query.$or = [
        { assignedDoctorId: doctor._id },
        { _id: { $in: authorizedPatientIds } },
      ];
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      const searchConditions = [{ fullName: regex }, { phone: regex }, { patientCode: regex }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [patients, total] = await Promise.all([
      Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Patient.countDocuments(query),
    ]);

    const serializedPatients = patients.map((p) => serializePatientForRole(p, req.user.role));

    return sendSuccess(res, { patients: serializedPatients, total, page: parseInt(page, 10) }, "Patients retrieved");
  } catch (err) {
    return next(err);
  }
}

async function getPatientById(req, res, next) {
  try {
    if (req.user.role === "hrms") {
      return next(new ForbiddenError("HRMS personnel are not authorized to view patient records"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const serializedPatient = serializePatientForRole(patient, req.user.role);
    return sendSuccess(res, { patient: serializedPatient }, "Patient details retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createPatient(req, res, next) {
  try {
    const { fullName, phone, email, gender, dateOfBirth, age, address, bloodGroup, medicalHistory, allergies } = req.body;

    if (!fullName || !phone) {
      return next(new ValidationError("Full name and phone number are required"));
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();

    // Check for duplicate patient by phone
    const existing = await Patient.findOne({ phone: cleanPhone });
    if (existing) {
      return next(
        new ConflictError(`A patient with phone '${cleanPhone}' is already registered as ${existing.fullName} (${existing.patientCode})`)
      );
    }

    const patientCode = await generateAtomicPatientCode();

    const patient = await Patient.create({
      patientCode,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : undefined,
      gender: gender || "female",
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      age: age ? parseInt(age, 10) : undefined,
      address: address ? address.trim() : "",
      bloodGroup: bloodGroup ? bloodGroup.trim() : "",
      medicalHistory: medicalHistory ? medicalHistory.trim() : "",
      allergies: Array.isArray(allergies) ? allergies : [],
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_REGISTERED",
      targetEntity: "Patient",
      targetId: patient._id.toString(),
      details: { patientCode: patient.patientCode, name: patient.fullName },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { patient }, "Patient registered successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    if (req.user.role === "patient") {
      const isOwner =
        (patient.userId && patient.userId.toString() === req.user._id.toString()) ||
        (req.user.phone && patient.phone === req.user.phone) ||
        (req.user.email && patient.email && patient.email.toLowerCase() === req.user.email.toLowerCase());

      if (!isOwner) {
        return next(new ForbiddenError("Unauthorized record update attempt"));
      }
    }

    const { fullName, phone, email, address, bloodGroup, medicalHistory, allergies, emergencyContact } = req.body;

    if (fullName) patient.fullName = fullName.trim();
    if (phone) patient.phone = phone.replace(/[^0-9+]/g, "").trim();
    if (email !== undefined) patient.email = email ? email.trim().toLowerCase() : undefined;
    if (address !== undefined) patient.address = address.trim();
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup.trim();
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory.trim();
    if (allergies !== undefined) patient.allergies = Array.isArray(allergies) ? allergies : [];
    if (emergencyContact) patient.emergencyContact = emergencyContact;

    await patient.save();

    return sendSuccess(res, { patient }, "Patient profile updated");
  } catch (err) {
    return next(err);
  }
}

// Permanent Database Deletion (Requires Owner/Admin with Comprehensive Dependency Validation)
async function deletePatientPermanently(req, res, next) {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) {
      return next(new NotFoundError("Patient record not found"));
    }

    const patientName = patient.fullName;
    const patientCode = patient.patientCode;

    // 1. Dependency Check: Linked Invoices (Both active and historical)
    const invoiceCount = await Invoice.countDocuments({ patientId: patient._id });
    if (invoiceCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${invoiceCount} linked invoice(s) exist. Financial and billing records cannot be orphaned due to statutory accounting compliance.`
        )
      );
    }

    // 2. Dependency Check: Linked Appointments (Both scheduled and historical)
    const apptCount = await Appointment.countDocuments({ patientId: patient._id });
    if (apptCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${apptCount} clinical appointment(s) exist. Medical appointment records cannot be orphaned.`
        )
      );
    }

    // 3. Dependency Check: Clinical Consultations
    const consultCount = await Consultation.countDocuments({ patientId: patient._id });
    if (consultCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${consultCount} clinical consultation(s) exist. Medical history must be preserved.`
        )
      );
    }

    // 4. Dependency Check: Prescriptions
    const rxCount = await Prescription.countDocuments({ patientId: patient._id });
    if (rxCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${rxCount} prescription record(s) exist. Medication records must be preserved.`
        )
      );
    }

    // 5. Dependency Check: Follow-ups
    const followUpCount = await FollowUp.countDocuments({ patientId: patient._id });
    if (followUpCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${followUpCount} clinical follow-up(s) exist.`
        )
      );
    }

    // 6. Dependency Check: Patient Documents
    const docCount = await PatientDocument.countDocuments({ patientId: patient._id });
    if (docCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${docCount} patient document(s) exist.`
        )
      );
    }

    // 7. Detach from CRM Lead if any converted lead points to this patient
    await Lead.updateMany(
      { convertedPatientId: patient._id },
      { $unset: { convertedPatientId: 1 } }
    );

    // 8. Delete Patient Document
    await Patient.findByIdAndDelete(id);

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_PERMANENTLY_DELETED",
      targetEntity: "Patient",
      targetId: id,
      details: {
        patientCode,
        fullName: patientName,
        phone: patient.phone,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { deletedId: id, patientCode, fullName: patientName },
      `Patient record '${patientName}' (${patientCode}) permanently deleted from database`
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatientPermanently,
};


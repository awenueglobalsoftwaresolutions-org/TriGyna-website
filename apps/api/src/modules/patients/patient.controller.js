const Patient = require("./patient.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

// Helper to generate sequential patient code safely
async function generatePatientCode() {
  const count = await Patient.countDocuments();
  let codeNum = 1000 + count + 1;
  while (await Patient.exists({ patientCode: `TG-P-${codeNum}` })) {
    codeNum++;
  }
  return `TG-P-${codeNum}`;
}

async function listPatients(req, res, next) {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const query = {};

    // Patient role can only access their own record
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!myPatient) {
        return sendSuccess(res, { patients: [], total: 0 }, "No patient profile linked");
      }
      if (!myPatient.userId) {
        myPatient.userId = req.user._id;
        await myPatient.save();
      }
      return sendSuccess(res, { patients: [myPatient], total: 1 }, "Patient profile retrieved");
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ fullName: regex }, { phone: regex }, { patientCode: regex }];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [patients, total] = await Promise.all([
      Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      Patient.countDocuments(query),
    ]);

    return sendSuccess(res, { patients, total, page: parseInt(page, 10) }, "Patients retrieved");
  } catch (err) {
    return next(err);
  }
}

async function getPatientById(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    // Patient scope validation
    if (req.user.role === "patient") {
      const isOwner =
        (patient.userId && patient.userId.toString() === req.user._id.toString()) ||
        (req.user.phone && patient.phone === req.user.phone) ||
        (req.user.email && patient.email && patient.email.toLowerCase() === req.user.email.toLowerCase());

      if (!isOwner) {
        return next(new ForbiddenError("You are not authorized to view records of other patients"));
      }

      if (!patient.userId) {
        patient.userId = req.user._id;
        await patient.save();
      }
    }

    return sendSuccess(res, { patient }, "Patient details retrieved");
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

    const patientCode = await generatePatientCode();

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

module.exports = {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
};

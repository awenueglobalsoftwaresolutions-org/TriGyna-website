const Doctor = require("../doctors/doctor.model");
const Patient = require("../patients/patient.model");
const Appointment = require("../appointments/appointment.model");
const Consultation = require("../clinical/consultation.model");
const Lead = require("../crm/lead.model");
const { ForbiddenError } = require("../../shared/errors");

/**
 * Authorization Policy Service for TriGyna Healthcare System
 * Centralized, role-based and resource-level access control.
 */

/**
 * Check if the authenticated user has permission to access a patient record.
 * @param {Object} user - req.user from JWT
 * @param {Object} patient - Patient document or object
 * @returns {Promise<boolean>}
 */
async function canAccessPatient(user, patient) {
  if (!user || !patient) return false;

  // 1. Executive and Clinic Administrators
  if (["owner", "super_admin", "admin"].includes(user.role)) {
    return true;
  }

  // 2. Patient: Can only access their own linked patient chart
  if (user.role === "patient") {
    if (patient.userId && patient.userId.toString() === user._id.toString()) {
      return true;
    }
    return false;
  }

  // 3. Reception: Operational access for registration, billing, and scheduling
  if (user.role === "reception") {
    return true;
  }

  // 4. CRM / Sales: Lead follow-up and appointment booking access
  if (user.role === "crm" || user.role === "sales") {
    return true;
  }

  // 5. Doctor: Must have an authorized clinical relationship or direct assignment
  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) return false;

    // Check direct primary doctor assignment
    if (patient.assignedDoctorId && patient.assignedDoctorId.toString() === doctor._id.toString()) {
      return true;
    }

    // Check existing appointment with this doctor
    const hasAppointment = await Appointment.exists({
      doctorId: doctor._id,
      patientId: patient._id,
    });
    if (hasAppointment) return true;

    // Check existing consultation with this doctor
    const hasConsultation = await Consultation.exists({
      doctorId: doctor._id,
      patientId: patient._id,
    });
    if (hasConsultation) return true;

    return false;
  }

  // 6. HRMS or unapproved roles are strictly blocked from patient records
  return false;
}

/**
 * Serialize patient data according to least-privilege principles per role.
 * Sensitive clinical data (medical history, allergies) is stripped for operational roles.
 * @param {Object} patient - Plain patient object or mongoose doc
 * @param {string} role - Authenticated user role
 * @returns {Object} Serialized patient
 */
function serializePatientForRole(patient, role) {
  if (!patient) return null;
  const raw = typeof patient.toObject === "function" ? patient.toObject() : { ...patient };

  // Full clinical view for medical and administrative roles
  if (["owner", "super_admin", "admin", "doctor", "patient"].includes(role)) {
    return raw;
  }

  // Reception: Operational view (demographics, contact, scheduling details, but NO clinical notes/allergies)
  if (role === "reception") {
    const { medicalHistory, allergies, ...receptionView } = raw;
    return receptionView;
  }

  // CRM / Sales: Minimum lead & follow-up view (contact info and status only)
  if (role === "crm" || role === "sales") {
    return {
      _id: raw._id,
      patientCode: raw.patientCode,
      fullName: raw.fullName,
      phone: raw.phone,
      email: raw.email,
      gender: raw.gender,
      status: raw.status,
      assignedDoctorId: raw.assignedDoctorId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  // Fallback for any other role
  return {
    _id: raw._id,
    patientCode: raw.patientCode,
    fullName: raw.fullName,
    status: raw.status,
  };
}

/**
 * Check if the authenticated user has permission to access a consultation record.
 * @param {Object} user - req.user
 * @param {Object} consultation - Consultation document
 * @returns {Promise<boolean>}
 */
async function canAccessConsultation(user, consultation) {
  if (!user || !consultation) return false;

  if (["owner", "super_admin", "admin"].includes(user.role)) {
    return true;
  }

  if (user.role === "patient") {
    const patient = await Patient.findOne({ userId: user._id });
    if (!patient) return false;
    const patId = consultation.patientId?._id || consultation.patientId;
    // Patient can only view their own consultations once finalized
    return patId.toString() === patient._id.toString() && consultation.isFinalized === true;
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) return false;

    const docId = consultation.doctorId?._id || consultation.doctorId;
    if (docId && docId.toString() === doctor._id.toString()) {
      return true;
    }

    // Check if doctor has an appointment with this patient
    const patId = consultation.patientId?._id || consultation.patientId;
    const hasRel = await Appointment.exists({ doctorId: doctor._id, patientId: patId });
    return !!hasRel;
  }

  return false;
}

/**
 * Check if the authenticated user can access a billing document (Invoice or Receipt).
 * @param {Object} user - req.user
 * @param {Object} doc - Invoice or Receipt document
 * @returns {Promise<boolean>}
 */
async function canAccessBillingDocument(user, doc) {
  if (!user || !doc) return false;

  // Executive, Billing, Sales, and Operations Staff
  if (["owner", "super_admin", "admin", "reception", "sales", "crm"].includes(user.role)) {
    return true;
  }

  // Patient: Can access only their own invoices and receipts
  if (user.role === "patient") {
    const patient = await Patient.findOne({ userId: user._id });
    if (!patient) return false;
    const docPatientId = doc.patientId?._id || doc.patientId;
    return docPatientId && docPatientId.toString() === patient._id.toString();
  }

  // Doctor: Can access if assigned to this document or appointment
  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) return false;
    const docDoctorId = doc.doctorId?._id || doc.doctorId;
    if (docDoctorId && docDoctorId.toString() === doctor._id.toString()) {
      return true;
    }
    const docPatientId = doc.patientId?._id || doc.patientId;
    const hasRel = await Appointment.exists({ doctorId: doctor._id, patientId: docPatientId });
    return !!hasRel;
  }

  // CRM / Sales: Operational billing access for assigned leads and permitted patient scope
  if (user.role === "crm" || user.role === "sales") {
    const docPatientId = doc.patientId?._id || doc.patientId;
    if (!docPatientId) return true; // generic doc with no patient attachment

    // Check if user has an assigned lead converted to this patient
    const hasAssignedLead = await Lead.exists({
      assignedTo: user._id,
      convertedPatientId: docPatientId,
    });
    if (hasAssignedLead) return true;

    // Check if user is assigned to a lead matching the patient's phone
    const patientDoc = await Patient.findById(docPatientId).select("phone");
    if (patientDoc && patientDoc.phone) {
      const hasLeadPhone = await Lead.exists({
        assignedTo: user._id,
        phone: patientDoc.phone,
      });
      if (hasLeadPhone) return true;
    }

    // Permit authorized sales/crm staff access across CRM business records
    return true;
  }

  // HRMS and other unrelated roles are strictly forbidden
  return false;
}

/**
 * Check if authenticated user can access a specific lead
 * @param {Object} user - req.user
 * @param {Object} lead - Lead document or object
 * @returns {boolean}
 */
function canAccessLead(user, lead) {
  if (!user || !lead) return false;
  if (["owner", "super_admin", "admin"].includes(user.role)) return true;
  if (user.role === "sales" || user.role === "crm") {
    const { hasPermission, PERMISSIONS } = require("../../config/permissions");
    if (hasPermission(user, PERMISSIONS.LEADS_VIEW_ALL)) {
      return true;
    }
    const assignedId = lead.assignedTo?._id || lead.assignedTo;
    if (assignedId && assignedId.toString() === user._id.toString()) {
      return true;
    }
    // Allow unassigned leads viewing for sales intake/claiming
    if (!assignedId) {
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Check if authenticated user can access a specific prescription
 * @param {Object} user - req.user
 * @param {Object} prescription - Prescription document
 * @returns {Promise<boolean>}
 */
async function canAccessPrescription(user, prescription) {
  if (!user || !prescription) return false;
  if (["owner", "super_admin", "admin"].includes(user.role)) return true;

  if (user.role === "patient") {
    const patient = await Patient.findOne({ userId: user._id });
    if (!patient) return false;
    const patId = prescription.patientId?._id || prescription.patientId;
    return (
      patId &&
      patId.toString() === patient._id.toString() &&
      (prescription.isReleasedToPatient === true || prescription.status === "finalized")
    );
  }

  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) return false;
    const docId = prescription.doctorId?._id || prescription.doctorId;
    if (docId && docId.toString() === doctor._id.toString()) return true;
    const patId = prescription.patientId?._id || prescription.patientId;
    return !!(await Appointment.exists({ doctorId: doctor._id, patientId: patId }));
  }

  return false;
}

module.exports = {
  canAccessPatient,
  serializePatientForRole,
  canAccessConsultation,
  canAccessBillingDocument,
  canAccessLead,
  canAccessPrescription,
};

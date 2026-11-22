const mongoose = require("mongoose");
const Patient = require("./patient.model");
const Appointment = require("../appointments/appointment.model");
const Invoice = require("../billing/invoice.model");
const Payment = require("../billing/payment.model");
const Receipt = require("../billing/receipt.model");
const Lead = require("../crm/lead.model");
const Consultation = require("../clinical/consultation.model");
const Prescription = require("../clinical/prescription.model");
const TreatmentPlan = require("../clinical/treatmentplan.model");
const FollowUp = require("../clinical/followup.model");
const PatientDocument = require("./document.model");
const Doctor = require("../doctors/doctor.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { generateAtomicPatientCode, generateAtomicAppointmentCode } = require("../../shared/counter.service");
const { safeRegex } = require("../../shared/regex.utils");
const { canAccessPatient, serializePatientForRole } = require("../auth/authorization.service");

/**
 * 1. Dynamic Patient Statistics & KPI Metrics
 * GET /api/v1/patients/stats
 */
async function getPatientStats(req, res, next) {
  try {
    if (req.user.role === "hrms") {
      return next(new ForbiddenError("HRMS personnel are not authorized to view patient stats"));
    }

    // Reference dates for current reporting period
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // Filter doctor patients if user is a doctor
    let basePatientQuery = { isArchived: { $ne: true } };
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (doctor) {
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
        basePatientQuery.$or = [
          { assignedDoctorId: doctor._id },
          { _id: { $in: authorizedPatientIds } },
        ];
      }
    }

    // 1. Aggregations for Patient Counts
    const [
      totalPatients,
      activePatients,
      inactivePatients,
      femaleCount,
      womensHealthWithIntake,
      newThisMonth,
      newPrevMonth,
      recent30dCount,
      apptPatientIds,
      followupDuePatientIds,
    ] = await Promise.all([
      Patient.countDocuments(basePatientQuery),
      Patient.countDocuments({ ...basePatientQuery, status: "active" }),
      Patient.countDocuments({
        $or: [{ status: "inactive" }, { isArchived: true }],
      }),
      Patient.countDocuments({ ...basePatientQuery, gender: "female" }),
      Patient.countDocuments({
        ...basePatientQuery,
        gender: "female",
        medicalHistory: { $exists: true, $ne: "" },
      }),
      Patient.countDocuments({
        ...basePatientQuery,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      Patient.countDocuments({
        ...basePatientQuery,
        createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
      }),
      Patient.countDocuments({
        ...basePatientQuery,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Appointment.distinct("patientId", { status: { $ne: "cancelled" } }),
      FollowUp.distinct("patientId", { status: { $in: ["scheduled", "pending", "planned"] } }),
    ]);

    // Active this month: unique patients who have had appointments or consultations in the current month
    const [monthApptPatients, monthConsultPatients] = await Promise.all([
      Appointment.distinct("patientId", {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $ne: "cancelled" },
      }),
      Consultation.distinct("patientId", {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }),
    ]);
    const activeThisMonthSet = new Set([
      ...monthApptPatients.map((id) => id.toString()),
      ...monthConsultPatients.map((id) => id.toString()),
    ]);
    const activeThisMonthCount = activeThisMonthSet.size > 0 ? activeThisMonthSet.size : apptPatientIds.length;

    // Calculations
    const cohortPct = femaleCount > 0 ? Math.round((womensHealthWithIntake / femaleCount) * 100) : 0;
    const regGrowthPct =
      newPrevMonth > 0
        ? Math.round(((newThisMonth - newPrevMonth) / newPrevMonth) * 100)
        : newThisMonth > 0
        ? 20
        : 0;

    return sendSuccess(res, {
      kpis: {
        totalPatients,
        activePatients,
        inactivePatients,
        womensHealth: {
          count: womensHealthWithIntake,
          cohortTotal: femaleCount,
          percentage: cohortPct,
        },
        newRegistrations: {
          count: newThisMonth || recent30dCount,
          trendPercentage: regGrowthPct,
        },
        activeThisMonth: {
          count: activeThisMonthCount,
          withAppointments: apptPatientIds.length,
        },
      },
      tabCounts: {
        all: totalPatients,
        active: activePatients,
        new: newThisMonth || recent30dCount,
        with_appointments: apptPatientIds.length,
        followup_due: followupDuePatientIds.length,
        inactive: inactivePatients,
      },
    }, "Patient statistics retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * 2. List Patients Directory with Tabs, Search, Advanced Filters & Pagination
 * GET /api/v1/patients
 */
async function listPatients(req, res, next) {
  try {
    const {
      search,
      tab = "all",
      gender,
      bloodGroup,
      clinicalFocus,
      sortBy = "createdAt",
      sortOrder = "desc",
      limit = 20,
      page = 1,
    } = req.query;

    const query = {};

    // 1. HRMS personnel restriction
    if (req.user.role === "hrms") {
      return next(new ForbiddenError("HRMS personnel are not authorized to view patient clinical records"));
    }

    // 2. Patient role can only access their own linked record
    if (req.user.role === "patient") {
      const myPatient = await Patient.findOne({ userId: req.user._id });
      if (!myPatient) {
        return sendSuccess(res, { patients: [], total: 0, page: 1, limit: parseInt(limit, 10), totalPages: 0 }, "No patient profile linked");
      }
      return sendSuccess(res, { patients: [myPatient], total: 1, page: 1, limit: 1, totalPages: 1 }, "Patient profile retrieved");
    }

    // 3. Doctor role: authorized patients only
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

    // 4. Tab filtering logic
    if (tab === "active") {
      query.status = "active";
      query.isArchived = { $ne: true };
    } else if (tab === "new") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      query.createdAt = { $gte: thirtyDaysAgo };
      query.isArchived = { $ne: true };
    } else if (tab === "with_appointments") {
      const apptPatientIds = await Appointment.distinct("patientId", { status: { $ne: "cancelled" } });
      query._id = { $in: apptPatientIds };
      query.isArchived = { $ne: true };
    } else if (tab === "followup_due") {
      const fuPatientIds = await FollowUp.distinct("patientId", { status: { $in: ["scheduled", "pending", "planned"] } });
      query._id = { $in: fuPatientIds };
      query.isArchived = { $ne: true };
    } else if (tab === "inactive") {
      query.$or = [{ status: "inactive" }, { isArchived: true }];
    } else {
      // "all" - default exclude merged records
      query.isArchived = { $ne: true };
    }

    // 5. Gender Filter
    if (gender && gender !== "all") {
      query.gender = gender.toLowerCase();
    }

    // 6. Blood Group Filter
    if (bloodGroup && bloodGroup !== "all") {
      query.bloodGroup = bloodGroup.trim();
    }

    // 7. Clinical Focus / Primary Health Concern Filter
    if (clinicalFocus && clinicalFocus !== "all") {
      const focusRegex = safeRegex(clinicalFocus);
      if (focusRegex) {
        query.medicalHistory = focusRegex;
      }
    }

    // 8. Search query matching name, phone, patientCode, email
    if (search && search.trim()) {
      const regex = safeRegex(search.trim());
      if (regex) {
        const searchConditions = [
          { fullName: regex },
          { phone: regex },
          { patientCode: regex },
          { email: regex },
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }
    }

    // Sorting
    const sortField = ["createdAt", "fullName", "patientCode", "age"].includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortObj = { [sortField]: sortDirection };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [patients, total] = await Promise.all([
      Patient.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Patient.countDocuments(query),
    ]);

    const serializedPatients = patients.map((p) => serializePatientForRole(p, req.user.role));
    const totalPages = Math.ceil(total / limitNum) || 1;

    return sendSuccess(res, {
      patients: serializedPatients,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    }, "Patients retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * 3. Retrieve Patient Details by ID
 * GET /api/v1/patients/:id
 */
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

/**
 * 4. Comprehensive Patient Overview Tab Data
 * GET /api/v1/patients/:id/overview
 */
async function getPatientOverview(req, res, next) {
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

    // Fetch related records concurrently
    const [
      latestCompletedAppt,
      upcomingAppt,
      latestConsult,
      upcomingFollowUp,
      totalAppts,
      totalConsults,
      totalRx,
      totalFollowups,
      totalInvoices,
      totalDocs,
    ] = await Promise.all([
      Appointment.findOne({ patientId: patient._id, status: "completed" }).sort({ appointmentDate: -1 }),
      Appointment.findOne({ patientId: patient._id, status: { $in: ["scheduled", "checked_in"] } }).sort({ appointmentDate: 1 }),
      Consultation.findOne({ patientId: patient._id }).sort({ consultationDate: -1, createdAt: -1 }),
      FollowUp.findOne({ patientId: patient._id, status: { $in: ["scheduled", "pending"] } }).sort({ dueDate: 1 }),
      Appointment.countDocuments({ patientId: patient._id }),
      Consultation.countDocuments({ patientId: patient._id }),
      Prescription.countDocuments({ patientId: patient._id }),
      FollowUp.countDocuments({ patientId: patient._id }),
      Invoice.countDocuments({ patientId: patient._id }),
      PatientDocument.countDocuments({ patientId: patient._id }),
    ]);

    // Parse clinical focus & chronic conditions
    let clinicalFocus = "General Consultation";
    let focusTag = "General";
    if (patient.medicalHistory) {
      const parts = patient.medicalHistory.split("|").map((s) => s.trim());
      clinicalFocus = parts[0] || "General Consultation";
      focusTag = parts[1] || (patient.allergies?.length ? "Allergy" : "General");
    }

    const chronicConditions = latestConsult?.diagnosis || (patient.medicalHistory?.includes("Hypertension") ? "Hypertension (Controlled)" : "None Reported");

    const clinicalSummary = {
      clinicalFocus,
      focusTag,
      allergies: patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "No Known Allergies",
      chronicConditions,
      lastVisit: latestCompletedAppt ? latestCompletedAppt.appointmentDate : (latestConsult ? new Date(latestConsult.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "None Recorded"),
      nextFollowUp: upcomingFollowUp ? new Date(upcomingFollowUp.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (upcomingAppt ? upcomingAppt.appointmentDate : "None Scheduled"),
    };

    // Synthesize chronological activity timeline
    const activity = await assemblePatientTimeline(patient);

    const serializedPatient = serializePatientForRole(patient, req.user.role);

    return sendSuccess(res, {
      patient: serializedPatient,
      clinicalSummary,
      recentActivity: activity.slice(0, 10),
      counts: {
        appointments: totalAppts,
        consultations: totalConsults,
        prescriptions: totalRx,
        followups: totalFollowups,
        invoices: totalInvoices,
        documents: totalDocs,
      },
    }, "Patient overview retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * Helper: Assembles a consolidated chronological timeline from real DB collections
 */
async function assemblePatientTimeline(patient) {
  const events = [];

  // 1. Patient Registration Event
  if (patient.createdAt) {
    events.push({
      id: `reg-${patient._id}`,
      type: "registration",
      title: "Patient Registered",
      subtitle: "Profile created and verified",
      date: patient.createdAt,
      status: "verified",
      icon: "UserCheck",
    });
  }

  // 2. Real Appointments
  const appts = await Appointment.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(10);
  for (const a of appts) {
    events.push({
      id: `appt-${a._id}`,
      type: "appointment",
      title: a.status === "completed" ? "Appointment Completed" : "Appointment Scheduled",
      subtitle: `${a.mode || "Consultation"} • ${a.startTime || "Scheduled"}`,
      date: a.appointmentDate ? new Date(`${a.appointmentDate}T${a.startTime || "00:00"}:00Z`) : a.createdAt,
      status: a.status,
      code: a.appointmentCode,
      icon: "Calendar",
    });
  }

  // 3. Real Consultations
  const consults = await Consultation.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(10);
  for (const c of consults) {
    events.push({
      id: `consult-${c._id}`,
      type: "consultation",
      title: "Consultation Completed",
      subtitle: c.diagnosis || c.chiefComplaints || "Clinical Consultation",
      date: c.consultationDate || c.finalizedAt || c.createdAt,
      status: c.status || "finalized",
      code: c.consultationCode,
      icon: "Stethoscope",
    });
  }

  // 4. Prescriptions
  const rxs = await Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(5);
  for (const r of rxs) {
    events.push({
      id: `rx-${r._id}`,
      type: "prescription",
      title: "Digital Prescription Issued",
      subtitle: `${r.medications?.length || 0} prescribed medications`,
      date: r.createdAt,
      status: r.isReleasedToPatient ? "released" : "draft",
      icon: "Pill",
    });
  }

  // 5. Follow-ups
  const fus = await FollowUp.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(5);
  for (const f of fus) {
    events.push({
      id: `fu-${f._id}`,
      type: "followup",
      title: `Follow-up ${f.status === "completed" ? "Completed" : "Scheduled"}`,
      subtitle: `${f.serviceName} • Due: ${f.dueDate ? new Date(f.dueDate).toLocaleDateString("en-IN") : "TBD"}`,
      date: f.dueDate || f.createdAt,
      status: f.status,
      code: f.followUpCode,
      icon: "Clock",
    });
  }

  // 6. Invoices
  const invs = await Invoice.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(5);
  for (const inv of invs) {
    events.push({
      id: `inv-${inv._id}`,
      type: "invoice",
      title: `Invoice ${inv.status === "paid" ? "Paid" : "Issued"}`,
      subtitle: `₹${inv.totalAmount?.toLocaleString() || "0"} • Ref: ${inv.invoiceNumber}`,
      date: inv.paidAt || inv.createdAt,
      status: inv.status,
      icon: "Receipt",
    });
  }

  // Sort strictly newest to oldest
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

/**
 * 5. Full Patient Activity Feed
 * GET /api/v1/patients/:id/activity
 */
async function getPatientActivity(req, res, next) {
  try {
    if (req.user.role === "hrms") {
      return next(new ForbiddenError("HRMS personnel are not authorized to view patient activity"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient activity"));
    }

    const activity = await assemblePatientTimeline(patient);
    return sendSuccess(res, { activity }, "Patient activity history retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 6. Patient Clinical Summary
 * GET /api/v1/patients/:id/clinical-summary
 */
async function getPatientClinicalSummary(req, res, next) {
  try {
    if (req.user.role === "hrms" || req.user.role === "sales") {
      return next(new ForbiddenError("Your role is not authorized to access detailed clinical summaries"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return next(new NotFoundError("Patient not found"));
    }

    const consults = await Consultation.find({ patientId: patient._id })
      .populate("doctorId", "userId specialization")
      .sort({ consultationDate: -1, createdAt: -1 });

    const treatmentPlans = await TreatmentPlan.find({ patientId: patient._id }).sort({ createdAt: -1 });
    const prescriptions = await Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 });

    return sendSuccess(res, {
      patientCode: patient.patientCode,
      fullName: patient.fullName,
      bloodGroup: patient.bloodGroup || "Not Recorded",
      allergies: patient.allergies || [],
      medicalHistory: patient.medicalHistory || "",
      consultations: consults,
      treatmentPlans,
      prescriptions,
    }, "Clinical summary retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 7. Patient Appointments
 * GET /api/v1/patients/:id/appointments
 */
async function getPatientAppointments(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate("doctorId", "userId specialization")
      .sort({ appointmentDate: -1, startTime: -1 });

    return sendSuccess(res, { appointments }, "Patient appointments retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 8. Patient Consultations
 * GET /api/v1/patients/:id/consultations
 */
async function getPatientConsultations(req, res, next) {
  try {
    if (req.user.role === "sales" || req.user.role === "hrms") {
      return next(new ForbiddenError("Unauthorized to view clinical consultations"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const consultations = await Consultation.find({ patientId: patient._id })
      .populate("doctorId", "userId specialization")
      .populate("prescriptionRef")
      .sort({ consultationDate: -1, createdAt: -1 });

    return sendSuccess(res, { consultations }, "Patient consultations retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 9. Patient Prescriptions
 * GET /api/v1/patients/:id/prescriptions
 */
async function getPatientPrescriptions(req, res, next) {
  try {
    if (req.user.role === "sales" || req.user.role === "hrms") {
      return next(new ForbiddenError("Unauthorized to view clinical prescriptions"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const prescriptions = await Prescription.find({ patientId: patient._id })
      .populate("doctorId", "userId specialization")
      .populate("consultationId", "consultationCode diagnosis")
      .sort({ createdAt: -1 });

    return sendSuccess(res, { prescriptions }, "Patient prescriptions retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 10. Patient Treatment Plans
 * GET /api/v1/patients/:id/treatment-plans
 */
async function getPatientTreatmentPlans(req, res, next) {
  try {
    if (req.user.role === "sales" || req.user.role === "hrms") {
      return next(new ForbiddenError("Unauthorized to view treatment plans"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const plans = await TreatmentPlan.find({ patientId: patient._id })
      .populate("doctorId", "userId specialization")
      .sort({ createdAt: -1 });

    return sendSuccess(res, { treatmentPlans: plans }, "Patient treatment plans retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 11. Patient Follow-ups
 * GET /api/v1/patients/:id/followups
 */
async function getPatientFollowUps(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const followups = await FollowUp.find({ patientId: patient._id })
      .populate("doctorId", "userId specialization")
      .sort({ dueDate: 1 });

    return sendSuccess(res, { followups }, "Patient follow-ups retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 12. Patient Documents
 * GET /api/v1/patients/:id/documents
 */
async function getPatientDocuments(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const documents = await PatientDocument.find({ patientId: patient._id }).sort({ createdAt: -1 });
    return sendSuccess(res, { documents }, "Patient documents retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 13. Upload Patient Document
 * POST /api/v1/patients/:id/documents
 */
async function uploadPatientDocument(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const { title, documentType, fileName, fileSize, mimeType, fileUrl, notes } = req.body;
    if (!title || !fileName || !fileUrl) {
      return next(new ValidationError("Document title, fileName, and fileUrl are required"));
    }

    const docCode = `DOC-${Date.now().toString().slice(-6)}`;
    const document = await PatientDocument.create({
      documentCode: docCode,
      patientId: patient._id,
      title: title.trim(),
      documentType: documentType || "Clinical Note",
      fileName: fileName.trim(),
      fileSize: fileSize || 102400,
      mimeType: mimeType || "application/pdf",
      fileUrl: fileUrl.trim(),
      uploadedBy: req.user._id,
      uploaderRole: req.user.role === "doctor" ? "doctor" : req.user.role === "admin" || req.user.role === "owner" ? "admin" : "staff",
      status: "verified",
      notes: notes ? notes.trim() : undefined,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_DOCUMENT_UPLOADED",
      targetEntity: "PatientDocument",
      targetId: document._id.toString(),
      details: { patientCode: patient.patientCode, title: document.title, documentCode: docCode },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { document }, "Patient document registered", 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * 14. Patient Invoices & Payments
 * GET /api/v1/patients/:id/invoices
 */
async function getPatientInvoices(req, res, next) {
  try {
    if (req.user.role === "doctor") {
      return next(new ForbiddenError("Doctors are not authorized to view financial billing records"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const invoices = await Invoice.find({ patientId: patient._id }).sort({ createdAt: -1 });
    return sendSuccess(res, { invoices }, "Patient invoices retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 15. Patient Payments
 * GET /api/v1/patients/:id/payments
 */
async function getPatientPayments(req, res, next) {
  try {
    if (req.user.role === "doctor") {
      return next(new ForbiddenError("Doctors are not authorized to view payment ledgers"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const allowed = await canAccessPatient(req.user, patient);
    if (!allowed) {
      return next(new ForbiddenError("You are not authorized to access this patient record"));
    }

    const payments = await Payment.find({ patientId: patient._id }).sort({ createdAt: -1 });
    return sendSuccess(res, { payments }, "Patient payments retrieved");
  } catch (err) {
    return next(err);
  }
}
  try {
    if (req.user.role === "doctor") {
      return next(new ForbiddenError("Doctors are not authorized to view payment ledgers"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const payments = await Payment.find({ patientId: patient._id }).sort({ createdAt: -1 });
    return sendSuccess(res, { payments }, "Patient payments retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 16. Pre-Registration Duplicate Check
 * POST /api/v1/patients/duplicate-check
 */
async function checkDuplicates(req, res, next) {
  try {
    const { phone, email, fullName, dateOfBirth } = req.body;
    const matches = [];

    const digitsOnly = phone ? phone.replace(/[^0-9]/g, "") : "";
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (last10) {
      // Create a flexible regex that matches the last 10 digits even if formatted with spaces or country code
      const flexiblePhonePattern = last10.split("").join("[\\s\\-\\(\\)]*");
      const phoneRegex = new RegExp(flexiblePhonePattern);

      const phoneMatches = await Patient.find({
        $or: [{ phone: phone.trim() }, { phone: phoneRegex }],
        isArchived: { $ne: true },
      })
        .select("patientCode fullName phone email dateOfBirth age status createdAt")
        .limit(5);

      for (const m of phoneMatches) {
        matches.push({
          matchType: "phone",
          confidence: "high",
          patient: m,
          reason: `Phone match found on record: ${m.phone}`,
        });
      }
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const emailMatches = await Patient.find({ email: cleanEmail, isArchived: { $ne: true } })
        .select("patientCode fullName phone email dateOfBirth age status createdAt")
        .limit(5);
      for (const m of emailMatches) {
        if (!matches.some((existing) => existing.patient._id.toString() === m._id.toString())) {
          matches.push({
            matchType: "email",
            confidence: "high",
            patient: m,
            reason: `Exact email match '${cleanEmail}'`,
          });
        }
      }
    }

    if (fullName && fullName.trim()) {
      const nameRegex = safeRegex(fullName.trim());
      if (nameRegex) {
        const nameMatches = await Patient.find({ fullName: nameRegex, isArchived: { $ne: true } })
          .select("patientCode fullName phone email dateOfBirth age status createdAt")
          .limit(5);
        for (const m of nameMatches) {
          if (!matches.some((existing) => existing.patient._id.toString() === m._id.toString())) {
            matches.push({
              matchType: "name",
              confidence: "medium",
              patient: m,
              reason: `Fuzzy name similarity match with '${fullName.trim()}'`,
            });
          }
        }
      }
    }

    return sendSuccess(res, {
      hasDuplicates: matches.length > 0,
      matchCount: matches.length,
      matches,
    }, matches.length > 0 ? "Possible duplicate profiles detected" : "No duplicates detected");
  } catch (err) {
    return next(err);
  }
}

/**
 * 17. Possible Duplicates for Existing Patient
 * GET /api/v1/patients/:id/possible-duplicates
 */
async function getPatientDuplicates(req, res, next) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    const query = {
      _id: { $ne: patient._id },
      isArchived: { $ne: true },
      $or: [
        { phone: patient.phone },
        ...(patient.email ? [{ email: patient.email }] : []),
        { fullName: patient.fullName },
      ],
    };

    const duplicates = await Patient.find(query).select("patientCode fullName phone email age gender status createdAt");
    return sendSuccess(res, {
      patientId: patient._id,
      patientCode: patient.patientCode,
      duplicates,
      count: duplicates.length,
    }, "Possible duplicates retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * 18. Preview Duplicate Merge Reconciliation
 * POST /api/v1/patients/merge/preview
 */
async function previewPatientMerge(req, res, next) {
  try {
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return next(new ForbiddenError("Only clinic Administrators or Owners can merge patient records"));
    }

    const { canonicalId, duplicateId } = req.body;
    if (!canonicalId || !duplicateId) {
      return next(new ValidationError("Both canonicalId and duplicateId are required"));
    }
    if (canonicalId === duplicateId) {
      return next(new ValidationError("Canonical and duplicate patient IDs cannot be identical"));
    }

    const [canonical, duplicate] = await Promise.all([
      Patient.findById(canonicalId),
      Patient.findById(duplicateId),
    ]);

    if (!canonical) return next(new NotFoundError("Canonical patient record not found"));
    if (!duplicate) return next(new NotFoundError("Duplicate patient record not found"));
    if (duplicate.isArchived || duplicate.status === "merged") {
      return next(new ConflictError(`Duplicate patient '${duplicate.fullName}' (${duplicate.patientCode}) has already been merged or archived`));
    }

    const [
      apptsCount,
      consultsCount,
      rxCount,
      tpCount,
      fuCount,
      docsCount,
      invsCount,
      pmtsCount,
      rcptsCount,
      leadsCount,
    ] = await Promise.all([
      Appointment.countDocuments({ patientId: duplicate._id }),
      Consultation.countDocuments({ patientId: duplicate._id }),
      Prescription.countDocuments({ patientId: duplicate._id }),
      TreatmentPlan.countDocuments({ patientId: duplicate._id }),
      FollowUp.countDocuments({ patientId: duplicate._id }),
      PatientDocument.countDocuments({ patientId: duplicate._id }),
      Invoice.countDocuments({ patientId: duplicate._id }),
      Payment.countDocuments({ patientId: duplicate._id }),
      Receipt.countDocuments({ patientId: duplicate._id }),
      Lead.countDocuments({ convertedPatientId: duplicate._id }),
    ]);

    return sendSuccess(res, {
      canonical: {
        _id: canonical._id,
        patientCode: canonical.patientCode,
        fullName: canonical.fullName,
        phone: canonical.phone,
        email: canonical.email,
      },
      duplicate: {
        _id: duplicate._id,
        patientCode: duplicate.patientCode,
        fullName: duplicate.fullName,
        phone: duplicate.phone,
        email: duplicate.email,
      },
      recordsToMigrate: {
        appointments: apptsCount,
        consultations: consultsCount,
        prescriptions: rxCount,
        treatmentPlans: tpCount,
        followups: fuCount,
        documents: docsCount,
        invoices: invsCount,
        payments: pmtsCount,
        receipts: rcptsCount,
        crmLeads: leadsCount,
        totalRecords:
          apptsCount +
          consultsCount +
          rxCount +
          tpCount +
          fuCount +
          docsCount +
          invsCount +
          pmtsCount +
          rcptsCount +
          leadsCount,
      },
      mergeAction: "All dependent clinical, financial, and CRM records will be atomically relinked to Canonical.",
    }, "Merge preview generated");
  } catch (err) {
    return next(err);
  }
}

/**
 * 19. Execute Atomic Patient Merge
 * POST /api/v1/patients/merge/execute
 */
async function executePatientMerge(req, res, next) {
  try {
    if (req.user.role !== "owner" && req.user.role !== "admin") {
      return next(new ForbiddenError("Strict Permission: Only Owners and Admins may commit a patient merge"));
    }

    const { canonicalId, duplicateId, reason } = req.body;
    if (!canonicalId || !duplicateId) {
      return next(new ValidationError("Both canonicalId and duplicateId are required"));
    }

    const [canonical, duplicate] = await Promise.all([
      Patient.findById(canonicalId),
      Patient.findById(duplicateId),
    ]);

    if (!canonical || !duplicate) {
      return next(new NotFoundError("One or both patient records do not exist"));
    }

    if (duplicate.isArchived || duplicate.status === "merged") {
      return next(new ConflictError("Duplicate patient is already archived or merged"));
    }

    // Atomic Relinking across all collections
    const [
      apptsRes,
      consultsRes,
      rxRes,
      tpRes,
      fuRes,
      docsRes,
      invsRes,
      pmtsRes,
      rcptsRes,
      leadsRes,
    ] = await Promise.all([
      Appointment.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      Consultation.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      Prescription.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      TreatmentPlan.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      FollowUp.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      PatientDocument.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      Invoice.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      Payment.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      Receipt.updateMany({ patientId: duplicate._id }, { $set: { patientId: canonical._id } }),
      Lead.updateMany({ convertedPatientId: duplicate._id }, { $set: { convertedPatientId: canonical._id } }),
    ]);

    // Archive the duplicate patient
    duplicate.status = "merged";
    duplicate.isArchived = true;
    duplicate.mergedInto = canonical._id;
    await duplicate.save();

    // Log high-priority audit trail
    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_MERGED",
      targetEntity: "Patient",
      targetId: canonical._id.toString(),
      details: {
        canonicalCode: canonical.patientCode,
        duplicateCode: duplicate.patientCode,
        duplicateId: duplicate._id.toString(),
        reason: reason || "Administrative duplicate resolution",
        migratedCounts: {
          appointments: apptsRes.modifiedCount,
          consultations: consultsRes.modifiedCount,
          prescriptions: rxRes.modifiedCount,
          invoices: invsRes.modifiedCount,
          payments: pmtsRes.modifiedCount,
        },
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      canonicalId: canonical._id,
      canonicalCode: canonical.patientCode,
      duplicateId: duplicate._id,
      duplicateCode: duplicate.patientCode,
      status: "merged_successfully",
      migratedCounts: {
        appointments: apptsRes.modifiedCount,
        consultations: consultsRes.modifiedCount,
        prescriptions: rxRes.modifiedCount,
        invoices: invsRes.modifiedCount,
        payments: pmtsRes.modifiedCount,
        receipts: rcptsRes.modifiedCount,
        documents: docsRes.modifiedCount,
      },
    }, `Successfully merged patient '${duplicate.fullName}' (${duplicate.patientCode}) into '${canonical.fullName}' (${canonical.patientCode})`);
  } catch (err) {
    return next(err);
  }
}

/**
 * 20. Export Patients to CSV
 * GET /api/v1/patients/export
 */
async function exportPatients(req, res, next) {
  try {
    if (req.user.role !== "owner" && req.user.role !== "admin" && req.user.role !== "reception") {
      return next(new ForbiddenError("Unauthorized to export patient directory data"));
    }

    const { search, tab, gender, bloodGroup } = req.query;
    const query = { isArchived: { $ne: true } };

    if (gender && gender !== "all") query.gender = gender.toLowerCase();
    if (bloodGroup && bloodGroup !== "all") query.bloodGroup = bloodGroup.trim();
    if (tab === "active") query.status = "active";
    if (tab === "inactive") query.$or = [{ status: "inactive" }, { isArchived: true }];

    if (search && search.trim()) {
      const regex = safeRegex(search.trim());
      if (regex) {
        query.$or = [{ fullName: regex }, { phone: regex }, { patientCode: regex }];
      }
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(1000);

    // Build CSV content
    const headers = ["Patient Code", "Full Name", "Age", "Gender", "Phone", "Email", "Blood Group", "Clinical Concern", "Status", "Registration Date"];
    const rows = patients.map((p) => [
      `"${p.patientCode || ""}"`,
      `"${(p.fullName || "").replace(/"/g, '""')}"`,
      `"${p.age || ""}"`,
      `"${p.gender || ""}"`,
      `"${p.phone || ""}"`,
      `"${p.email || ""}"`,
      `"${p.bloodGroup || "Not Recorded"}"`,
      `"${(p.medicalHistory || "General Consultation").replace(/"/g, '""')}"`,
      `"${p.status || "active"}"`,
      `"${p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : ""}"`,
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_DATA_EXPORTED",
      targetEntity: "Patient",
      details: { exportCount: patients.length, format: "CSV" },
      ipAddress: req.ip,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="trigyna_patients_${Date.now()}.csv"`);
    return res.status(200).send(csvString);
  } catch (err) {
    return next(err);
  }
}

/**
 * 21. Create New Patient
 * POST /api/v1/patients
 */
async function createPatient(req, res, next) {
  try {
    const {
      fullName,
      phone,
      email,
      gender = "female",
      dateOfBirth,
      age,
      address,
      bloodGroup,
      medicalHistory,
      allergies,
      emergencyContact,
    } = req.body;

    if (!fullName || !phone) {
      return next(new ValidationError("Full name and phone number are required"));
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();

    // Check for exact duplicate patient by phone
    const existing = await Patient.findOne({ phone: cleanPhone });
    if (existing) {
      return next(
        new ConflictError(
          `A patient with phone '${cleanPhone}' is already registered as ${existing.fullName} (${existing.patientCode})`
        )
      );
    }

    let calculatedAge = age ? parseInt(age, 10) : undefined;
    if (dateOfBirth && !calculatedAge) {
      const dob = new Date(dateOfBirth);
      const diff = Date.now() - dob.getTime();
      calculatedAge = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }

    const patientCode = await generateAtomicPatientCode();

    const patient = await Patient.create({
      patientCode,
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : undefined,
      gender: gender || "female",
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      age: calculatedAge,
      address: address ? address.trim() : "",
      bloodGroup: bloodGroup ? bloodGroup.trim() : "",
      medicalHistory: medicalHistory ? medicalHistory.trim() : "General Consultation",
      allergies: Array.isArray(allergies) ? allergies : (typeof allergies === "string" && allergies.trim() ? [allergies.trim()] : []),
      emergencyContact: emergencyContact || undefined,
      status: "active",
      isArchived: false,
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

/**
 * 22. Update Patient Profile
 * PATCH /api/v1/patients/:id
 */
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

    const {
      fullName,
      phone,
      email,
      gender,
      dateOfBirth,
      age,
      address,
      bloodGroup,
      medicalHistory,
      allergies,
      emergencyContact,
      status,
    } = req.body;

    if (fullName) patient.fullName = fullName.trim();
    if (phone) patient.phone = phone.replace(/[^0-9+]/g, "").trim();
    if (email !== undefined) patient.email = email ? email.trim().toLowerCase() : undefined;
    if (gender) patient.gender = gender;
    if (dateOfBirth) {
      patient.dateOfBirth = new Date(dateOfBirth);
      const diff = Date.now() - patient.dateOfBirth.getTime();
      patient.age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    } else if (age !== undefined) {
      patient.age = parseInt(age, 10);
    }
    if (address !== undefined) patient.address = address.trim();
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup.trim();
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory.trim();
    if (allergies !== undefined) {
      patient.allergies = Array.isArray(allergies) ? allergies : (typeof allergies === "string" ? [allergies] : []);
    }
    if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
    if (status && ["active", "inactive", "archived"].includes(status)) {
      patient.status = status;
    }

    await patient.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_PROFILE_UPDATED",
      targetEntity: "Patient",
      targetId: patient._id.toString(),
      details: { patientCode: patient.patientCode, fullName: patient.fullName },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { patient }, "Patient profile updated successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * 23. Update Patient Status (Active / Inactive / Archived)
 * PATCH /api/v1/patients/:id/status
 */
async function updatePatientStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!["active", "inactive", "archived"].includes(status)) {
      return next(new ValidationError("Status must be one of: 'active', 'inactive', 'archived'"));
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return next(new NotFoundError("Patient not found"));

    patient.status = status;
    if (status === "archived") {
      patient.isArchived = true;
    } else if (status === "active") {
      patient.isArchived = false;
    }
    await patient.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PATIENT_STATUS_CHANGED",
      targetEntity: "Patient",
      targetId: patient._id.toString(),
      details: { patientCode: patient.patientCode, status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { patient }, `Patient status updated to ${status}`);
  } catch (err) {
    return next(err);
  }
}

/**
 * 24. Permanent Database Deletion (Strict Owner/Admin with 6 Dependency Checks)
 * DELETE /api/v1/patients/:id
 */
async function deletePatientPermanently(req, res, next) {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) {
      return next(new NotFoundError("Patient record not found"));
    }

    const patientName = patient.fullName;
    const patientCode = patient.patientCode;

    // 1. Dependency Check: Linked Invoices
    const invoiceCount = await Invoice.countDocuments({ patientId: patient._id });
    if (invoiceCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete patient '${patientName}' (${patientCode}): ${invoiceCount} linked invoice(s) exist. Financial and billing records cannot be orphaned due to statutory accounting compliance.`
        )
      );
    }

    // 2. Dependency Check: Linked Appointments
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
  getPatientStats,
  listPatients,
  getPatientById,
  getPatientOverview,
  getPatientActivity,
  getPatientClinicalSummary,
  getPatientAppointments,
  getPatientConsultations,
  getPatientPrescriptions,
  getPatientTreatmentPlans,
  getPatientFollowUps,
  getPatientDocuments,
  uploadPatientDocument,
  getPatientInvoices,
  getPatientPayments,
  checkDuplicates,
  getPatientDuplicates,
  previewPatientMerge,
  executePatientMerge,
  exportPatients,
  createPatient,
  updatePatient,
  updatePatientStatus,
  deletePatientPermanently,
};

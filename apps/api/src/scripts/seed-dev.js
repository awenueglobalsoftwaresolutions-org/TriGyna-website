/**
 * TriGyna Healthcare Management Platform
 * Development Database Seed & Synthetic Record Provisioning Script
 *
 * Idempotent, safe to rerun, respects all schemas, validations, and indexes.
 * Target Database: mongodb://127.0.0.1:27017/trigyna
 */

const { connectDB, disconnectDB } = require("../config/database");
const env = require("../config/env");

// Models
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const Lead = require("../modules/crm/lead.model");
const Employee = require("../modules/hrms/employee.model");
const Attendance = require("../modules/hrms/attendance.model");
const LeaveRequest = require("../modules/hrms/leave.model");
const Invoice = require("../modules/billing/invoice.model");
const Expense = require("../modules/billing/expense.model");
const Payroll = require("../modules/hrms/payroll.model");
const AttendanceCorrection = require("../modules/hrms/attendance-correction.model");
const Organization = require("../modules/organization/organization.model");
const Notification = require("../modules/notifications/notification.model");
const { recordAudit } = require("../modules/audit/audit.service");

// Helper to calculate relative ISO date strings (YYYY-MM-DD)
function getRelativeDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// Helper to calculate relative Date objects
function getRelativeDate(offsetDays = 0, hours = 10, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function runSeed() {
  console.log("==================================================");
  console.log("TriGyna Platform — Development Database Seed");
  console.log("==================================================");

  // 1. Production Environment Guard
  if (env.NODE_ENV === "production" || process.env.NODE_ENV === "production") {
    console.error("[FATAL] Seed script aborted: Cannot run development seeding in production environment!");
    process.exit(1);
  }

  // 2. Validate Local Database Target
  if (!env.MONGODB_URI.includes("127.0.0.1") && !env.MONGODB_URI.includes("localhost")) {
    console.error(`[FATAL] Seed script aborted: Configured MONGODB_URI is not a local database: ${env.MONGODB_URI}`);
    process.exit(1);
  }

  console.log(`[Seed] Connecting to local MongoDB: ${env.MONGODB_URI}`);
  await connectDB();

  const report = {
    users: { created: 0, updated: 0 },
    doctors: { created: 0, updated: 0 },
    patients: { created: 0, updated: 0 },
    appointments: { created: 0, updated: 0 },
    consultations: { created: 0, updated: 0 },
    prescriptions: { created: 0, updated: 0 },
    leads: { created: 0, updated: 0 },
    employees: { created: 0, updated: 0 },
    attendance: { created: 0, updated: 0 },
    leaves: { created: 0, updated: 0 },
    invoices: { created: 0, updated: 0 },
    notifications: { created: 0, updated: 0 },
  };

  try {
    // --------------------------------------------------
    // STEP 1: Seed Primary Testing User Accounts
    // --------------------------------------------------
    console.log("\n--> 1. Seeding User Accounts (Bcrypt Hash: TriGyna@123)...");

    const defaultTestPassword = "TriGyna@123";
    const commonPasswordHash = await User.hashPassword(defaultTestPassword);

    const testUserDefinitions = [
      {
        name: "Sushil Kushwaha",
        email: "trigyna.health@gmail.com",
        phone: "+919172772326",
        role: "owner",
        status: "active",
      },
      {
        name: "Sushil Kumar",
        email: "admin@trigyna.test",
        phone: "9000000001",
        role: "admin",
        status: "active",
      },
      {
        name: "Dr. Aarav Sharma",
        email: "doctor@trigyna.test",
        phone: "9000000002",
        role: "doctor",
        status: "active",
      },
      {
        name: "Dr. Ananya Sharma",
        email: "ananya.sharma@trigyna.test",
        phone: "9000000010",
        role: "doctor",
        status: "active",
      },
      {
        name: "Rahul Gupta",
        email: "reception@trigyna.test",
        phone: "9000000005",
        role: "reception",
        status: "active",
      },
      {
        name: "Ananya Mishra",
        email: "patient@trigyna.test",
        phone: "9000000006",
        role: "patient",
        status: "active",
      },
      // Admin accounts managing CRM and HRMS sub-modules
      {
        name: "Priya Verma",
        email: "crm@trigyna.test",
        phone: "9000000003",
        role: "admin",
        status: "active",
      },
      {
        name: "Neha Singh",
        email: "hrms@trigyna.test",
        phone: "9000000004",
        role: "admin",
        status: "active",
      },
      // Additional Doctor staff accounts to fulfill 3 Doctor profiles
      {
        name: "Dr. Harshali Sutar",
        email: "harshali.sutar@trigyna.test",
        phone: "9000000007",
        role: "doctor",
        status: "active",
      },
      {
        name: "Dr. Rajesh Mehta",
        email: "rajesh.mehta@trigyna.test",
        phone: "9000000008",
        role: "doctor",
        status: "active",
      },
    ];

    const ownerPasswordHash = await User.hashPassword("TriGyna@2326");
    const userMap = {};

    for (const def of testUserDefinitions) {
      let user = await User.findOne({
        $or: [{ email: def.email.toLowerCase() }, { phone: def.phone }],
      });

      const userPwdHash = def.role === "owner" ? ownerPasswordHash : commonPasswordHash;

      if (!user) {
        user = await User.create({
          ...def,
          passwordHash: userPwdHash,
        });
        report.users.created++;
      } else {
        user.name = def.name;
        user.email = def.email.toLowerCase();
        user.phone = def.phone;
        user.role = def.role;
        user.status = def.status;
        user.passwordHash = userPwdHash; // Ensure test password stays valid
        await user.save();
        report.users.updated++;
      }
      userMap[def.email.toLowerCase()] = user;
    }

    console.log(`    Users provisioned: ${report.users.created} created, ${report.users.updated} updated.`);

    // --------------------------------------------------
    // STEP 2: Seed Doctor Profiles (3 Doctors)
    // --------------------------------------------------
    console.log("\n--> 2. Seeding Doctor Profiles (3 Profiles)...");

    const doctorDefinitions = [
      {
        userKey: "doctor@trigyna.test",
        specialization: ["Homoeopathy", "Chronic Diseases", "Respiratory & Skin Care"],
        qualifications: "BHMS, MD (Senior Consulting Homoeopath)",
        consultationFee: 800,
        bio: "Senior clinician with 14+ years experience treating chronic respiratory and dermatological conditions with constitutional homoeopathy.",
        workingHours: [
          { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 6, startTime: "10:00", endTime: "16:00", slotDurationMinutes: 30 },
        ],
      },
      {
        userKey: "harshali.sutar@trigyna.test",
        specialization: ["Homoeopathy", "Women's Wellness & PCOD", "Clinical Endocrinology"],
        qualifications: "BHMS, MD (Consultant Gynaecology & Homoeopathy)",
        consultationFee: 700,
        bio: "Specialist in natural management of polycystic ovarian syndrome (PCOD/PCOS), hormonal acne, and holistic women's reproductive health.",
        workingHours: [
          { dayOfWeek: 1, startTime: "10:00", endTime: "17:00", slotDurationMinutes: 30 },
          { dayOfWeek: 2, startTime: "10:00", endTime: "17:00", slotDurationMinutes: 30 },
          { dayOfWeek: 3, startTime: "10:00", endTime: "17:00", slotDurationMinutes: 30 },
          { dayOfWeek: 4, startTime: "10:00", endTime: "17:00", slotDurationMinutes: 30 },
          { dayOfWeek: 5, startTime: "10:00", endTime: "17:00", slotDurationMinutes: 30 },
        ],
      },
      {
        userKey: "rajesh.mehta@trigyna.test",
        specialization: ["Homoeopathy", "Clinical Dermatology", "Trichology & Hair Care"],
        qualifications: "BHMS, PGDCC (Clinical Cosmetology & Trichology)",
        consultationFee: 600,
        bio: "Expert in hair restoration, alopecia areata, eczema, psoriasis, and therapeutic anti-aging homoeopathic regimens.",
        workingHours: [
          { dayOfWeek: 2, startTime: "11:00", endTime: "19:00", slotDurationMinutes: 30 },
          { dayOfWeek: 3, startTime: "11:00", endTime: "19:00", slotDurationMinutes: 30 },
          { dayOfWeek: 4, startTime: "11:00", endTime: "19:00", slotDurationMinutes: 30 },
          { dayOfWeek: 5, startTime: "11:00", endTime: "19:00", slotDurationMinutes: 30 },
          { dayOfWeek: 6, startTime: "11:00", endTime: "17:00", slotDurationMinutes: 30 },
        ],
      },
      {
        userKey: "ananya.sharma@trigyna.test",
        specialization: ["Obstetrician & Gynecologist", "Antenatal & Maternal Care", "Fertility & Reproductive Health"],
        qualifications: "MS, DGO (Obstetrician & Gynecologist)",
        consultationFee: 800,
        bio: "Senior consultant with 12+ years experience in obstetrics, fertility, and high-risk pregnancy care.",
        workingHours: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
          { dayOfWeek: 6, startTime: "09:00", endTime: "16:00", slotDurationMinutes: 30 },
        ],
      },
    ];

    const doctorMap = {};

    for (const dDef of doctorDefinitions) {
      const u = userMap[dDef.userKey];
      if (!u) continue;

      let doc = await Doctor.findOne({ userId: u._id });
      if (!doc) {
        doc = await Doctor.create({
          userId: u._id,
          specialization: dDef.specialization,
          qualifications: dDef.qualifications,
          consultationFee: dDef.consultationFee,
          bio: dDef.bio,
          workingHours: dDef.workingHours,
          status: "active",
        });
        report.doctors.created++;
      } else {
        doc.specialization = dDef.specialization;
        doc.qualifications = dDef.qualifications;
        doc.consultationFee = dDef.consultationFee;
        doc.bio = dDef.bio;
        doc.workingHours = dDef.workingHours;
        doc.status = "active";
        await doc.save();
        report.doctors.updated++;
      }
      doctorMap[dDef.userKey] = doc;
    }

    console.log(`    Doctors provisioned: ${report.doctors.created} created, ${report.doctors.updated} updated.`);

    // --------------------------------------------------
    // STEP 3: Seed Synthetic Patients (10 Patients)
    // --------------------------------------------------
    console.log("\n--> 3. Seeding Synthetic Patient Profiles (10 Patients)...");

    const patientDefinitions = [
      {
        patientCode: "TR-1001",
        userIdKey: "patient@trigyna.test",
        fullName: "Ananya Mishra",
        phone: "9000000006",
        email: "patient@trigyna.test",
        gender: "female",
        age: 28,
        bloodGroup: "O+",
        address: "Flat 402, Green Meadows, Vashi, Navi Mumbai",
        medicalHistory: "Recurrent allergic rhinitis, morning sneezing fits, mild migraine triggered by screen fatigue.",
        allergies: ["Sulfa drugs", "Dust pollen"],
        emergencyContact: { name: "Sunil Mishra", phone: "9000000099", relationship: "Father" },
      },
      {
        patientCode: "TR-1002",
        fullName: "Meera Patel",
        phone: "9820000001",
        email: "meera.patel@synthetic.trigyna.test",
        gender: "female",
        age: 32,
        bloodGroup: "B+",
        address: "7B, Palm Court, Bandra West, Mumbai",
        medicalHistory: "Diagnosed PCOD for 3 years, irregular cycle, jawline cystic acne, insulin resistance.",
        allergies: ["Penicillin"],
        emergencyContact: { name: "Kunal Patel", phone: "9820000091", relationship: "Spouse" },
      },
      {
        patientCode: "TR-1003",
        fullName: "Sunita Deshmukh",
        phone: "9820000002",
        email: "sunita.deshmukh@synthetic.trigyna.test",
        gender: "female",
        age: 46,
        bloodGroup: "A+",
        address: "Row House 12, Kothrud, Pune",
        medicalHistory: "Perimenopausal hot flushes, mood fluctuations, sleep disturbance, joint stiffness.",
        allergies: [],
        emergencyContact: { name: "Anand Deshmukh", phone: "9820000092", relationship: "Spouse" },
      },
      {
        patientCode: "TR-1004",
        fullName: "Kavita Rao",
        phone: "9820000003",
        email: "kavita.rao@synthetic.trigyna.test",
        gender: "female",
        age: 25,
        bloodGroup: "AB+",
        address: "Flat 104, Sunrise Heights, Andheri East, Mumbai",
        medicalHistory: "Alopecia areata patchy hair loss on crown, stress-induced scalp dandruff.",
        allergies: ["Aspirin"],
        emergencyContact: { name: "Usha Rao", phone: "9820000093", relationship: "Mother" },
      },
      {
        patientCode: "TR-1005",
        fullName: "Pooja Shinde",
        phone: "9820000004",
        email: "pooja.shinde@synthetic.trigyna.test",
        gender: "female",
        age: 34,
        bloodGroup: "O+",
        address: "B-203, Nilgiri Apts, Thane West",
        medicalHistory: "Chronic hand eczema with seasonal flare-ups in winter, xerosis cutis.",
        allergies: ["Nickel jewelry"],
        emergencyContact: { name: "Ramesh Shinde", phone: "9820000094", relationship: "Spouse" },
      },
      {
        patientCode: "TR-1006",
        fullName: "Rajesh Nair",
        phone: "9820000005",
        email: "rajesh.nair@synthetic.trigyna.test",
        gender: "male",
        age: 41,
        bloodGroup: "B+",
        address: "Flat 12, Gulmohar Enclave, Borivali, Mumbai",
        medicalHistory: "Cervical spondylosis from desk posture, radiating shoulder tingling, tension headaches.",
        allergies: [],
        emergencyContact: { name: "Lata Nair", phone: "9820000095", relationship: "Spouse" },
      },
      {
        patientCode: "TR-1007",
        fullName: "Vikram Malhotra",
        phone: "9820000006",
        email: "vikram.malhotra@synthetic.trigyna.test",
        gender: "male",
        age: 37,
        bloodGroup: "A-",
        address: "Villa 3, Beverly Woods, Worli, Mumbai",
        medicalHistory: "Chronic gastro-oesophageal reflux, post-prandial bloating, non-ulcer dyspepsia.",
        allergies: [],
        emergencyContact: { name: "Neha Malhotra", phone: "9820000096", relationship: "Sister" },
      },
      {
        patientCode: "TR-1008",
        fullName: "Sneha Kulkarni",
        phone: "9820000007",
        email: "sneha.kulkarni@synthetic.trigyna.test",
        gender: "female",
        age: 29,
        bloodGroup: "O-",
        address: "Flat 6B, Mayfair Towers, Shivaji Park, Dadar",
        medicalHistory: "Persistent post-viral fatigue, low ferritin, unrefreshed morning sleep.",
        allergies: [],
        emergencyContact: { name: "Vikas Kulkarni", phone: "9820000097", relationship: "Brother" },
      },
      {
        patientCode: "TR-1009",
        fullName: "Deepika Joshi",
        phone: "9820000008",
        email: "deepika.joshi@synthetic.trigyna.test",
        gender: "female",
        age: 31,
        bloodGroup: "B+",
        address: "Plot 89, Sector 19, Airoli, Navi Mumbai",
        medicalHistory: "Chronic idiopathic urticaria, dermatographia, aggravated by heat and spicy food.",
        allergies: ["Shellfish", "Artificial food color"],
        emergencyContact: { name: "Suresh Joshi", phone: "9820000098", relationship: "Father" },
      },
      {
        patientCode: "TR-1010",
        fullName: "Amit Trivedi",
        phone: "9820000009",
        email: "amit.trivedi@synthetic.trigyna.test",
        gender: "male",
        age: 39,
        bloodGroup: "AB-",
        address: "Flat 502, Lake View Towers, Powai, Mumbai",
        medicalHistory: "Adult-onset atopic dermatitis, flexural lichenification, nocturnal pruritus.",
        allergies: ["NSAIDs"],
        emergencyContact: { name: "Pooja Trivedi", phone: "9820000099", relationship: "Spouse" },
      },
    ];

    const patientMap = {};

    for (const pDef of patientDefinitions) {
      let patient = await Patient.findOne({ patientCode: pDef.patientCode });
      const linkedUserId = pDef.userIdKey ? userMap[pDef.userIdKey]?._id : undefined;

      const pPayload = {
        fullName: pDef.fullName,
        phone: pDef.phone,
        email: pDef.email,
        gender: pDef.gender,
        age: pDef.age,
        bloodGroup: pDef.bloodGroup,
        address: pDef.address,
        medicalHistory: pDef.medicalHistory,
        allergies: pDef.allergies,
        emergencyContact: pDef.emergencyContact,
        status: "active",
      };
      if (linkedUserId) pPayload.userId = linkedUserId;

      if (!patient) {
        patient = await Patient.create({
          patientCode: pDef.patientCode,
          ...pPayload,
        });
        report.patients.created++;
      } else {
        Object.assign(patient, pPayload);
        await patient.save();
        report.patients.updated++;
      }
      patientMap[pDef.patientCode] = patient;
    }

    console.log(`    Patients provisioned: ${report.patients.created} created, ${report.patients.updated} updated.`);

    // --------------------------------------------------
    // STEP 4: Seed Appointments (10 Appointments)
    // --------------------------------------------------
    console.log("\n--> 4. Seeding Appointments (10 Varied Statuses)...");

    const docAarav = doctorMap["doctor@trigyna.test"];
    const docHarshali = doctorMap["harshali.sutar@trigyna.test"];
    const docRajesh = doctorMap["rajesh.mehta@trigyna.test"];

    const appointmentDefinitions = [
      {
        appointmentCode: "APT-2026-001",
        patientKey: "TR-1001", // Ananya Mishra
        doctorObj: docAarav,
        serviceName: "Homoeopathy Consultation",
        dateOffset: 0, // Today
        startTime: "10:00",
        endTime: "10:30",
        mode: "Online Video Consultation",
        status: "completed",
        paymentStatus: "paid",
        notes: "Initial consultation for allergic rhinitis and frontal headache.",
      },
      {
        appointmentCode: "APT-2026-002",
        patientKey: "TR-1002", // Meera Patel
        doctorObj: docHarshali,
        serviceName: "Women's Wellness & PCOD",
        dateOffset: 0, // Today
        startTime: "11:30",
        endTime: "12:00",
        mode: "In-Clinic Consultation",
        status: "in_consultation",
        paymentStatus: "paid",
        notes: "Follow-up for hormonal acne and menstrual cycle regulation.",
      },
      {
        appointmentCode: "APT-2026-003",
        patientKey: "TR-1003", // Sunita Deshmukh
        doctorObj: docAarav,
        serviceName: "Homoeopathy Consultation",
        dateOffset: 0, // Today
        startTime: "14:00",
        endTime: "14:30",
        mode: "In-Clinic Consultation",
        status: "checked_in",
        paymentStatus: "unpaid",
        notes: "Perimenopause consultation; patient arrived in clinic waiting lounge.",
      },
      {
        appointmentCode: "APT-2026-004",
        patientKey: "TR-1004", // Kavita Rao
        doctorObj: docRajesh,
        serviceName: "Skin & Hair Care",
        dateOffset: 1, // Tomorrow
        startTime: "10:30",
        endTime: "11:00",
        mode: "In-Clinic Consultation",
        status: "scheduled",
        paymentStatus: "unpaid",
        notes: "Scalp evaluation for patchy alopecia areata.",
      },
      {
        appointmentCode: "APT-2026-005",
        patientKey: "TR-1005", // Pooja Shinde
        doctorObj: docHarshali,
        serviceName: "Women's Wellness",
        dateOffset: 1, // Tomorrow
        startTime: "15:00",
        endTime: "15:30",
        mode: "Online Video Consultation",
        status: "scheduled",
        paymentStatus: "unpaid",
        notes: "Holistic skin support for chronic eczema.",
      },
      {
        appointmentCode: "APT-2026-006",
        patientKey: "TR-1006", // Rajesh Nair
        doctorObj: docAarav,
        serviceName: "Homoeopathy Consultation",
        dateOffset: 2, // In 2 days
        startTime: "11:00",
        endTime: "11:30",
        mode: "In-Clinic Consultation",
        status: "scheduled",
        paymentStatus: "unpaid",
        notes: "Cervical pain and postural migraine review.",
      },
      {
        appointmentCode: "APT-2026-007",
        patientKey: "TR-1007", // Vikram Malhotra
        doctorObj: docRajesh,
        serviceName: "Homoeopathy Consultation",
        dateOffset: -1, // Yesterday
        startTime: "16:00",
        endTime: "16:30",
        mode: "Online Video Consultation",
        status: "completed",
        paymentStatus: "paid",
        notes: "GERD and functional dyspepsia review.",
      },
      {
        appointmentCode: "APT-2026-008",
        patientKey: "TR-1008", // Sneha Kulkarni
        doctorObj: docHarshali,
        serviceName: "Women's Wellness",
        dateOffset: -2, // 2 days ago
        startTime: "10:00",
        endTime: "10:30",
        mode: "In-Clinic Consultation",
        status: "completed",
        paymentStatus: "paid",
        notes: "Fatigue profile and lifestyle alignment.",
      },
      {
        appointmentCode: "APT-2026-009",
        patientKey: "TR-1009", // Deepika Joshi
        doctorObj: docAarav,
        serviceName: "Skin & Hair Care",
        dateOffset: -3, // 3 days ago
        startTime: "14:00",
        endTime: "14:30",
        mode: "Online Video Consultation",
        status: "cancelled",
        paymentStatus: "waived",
        notes: "Patient rescheduled due to unexpected work travel.",
      },
      {
        appointmentCode: "APT-2026-010",
        patientKey: "TR-1010", // Amit Trivedi
        doctorObj: docRajesh,
        serviceName: "Skin & Hair Care",
        dateOffset: -4, // 4 days ago
        startTime: "12:00",
        endTime: "12:30",
        mode: "In-Clinic Consultation",
        status: "no_show",
        paymentStatus: "unpaid",
        notes: "Did not attend appointment; follow-up notification queued.",
      },
    ];

    const appointmentMap = {};

    for (const aDef of appointmentDefinitions) {
      const patient = patientMap[aDef.patientKey];
      if (!patient || !aDef.doctorObj) continue;

      const dateStr = getRelativeDateStr(aDef.dateOffset);

      let appt = await Appointment.findOne({ appointmentCode: aDef.appointmentCode });
      const payload = {
        patientId: patient._id,
        doctorId: aDef.doctorObj._id,
        serviceName: aDef.serviceName,
        appointmentDate: dateStr,
        startTime: aDef.startTime,
        endTime: aDef.endTime,
        mode: aDef.mode,
        status: aDef.status,
        paymentStatus: aDef.paymentStatus,
        notes: aDef.notes,
        bookingSource: "portal",
      };

      if (!appt) {
        appt = await Appointment.create({
          appointmentCode: aDef.appointmentCode,
          ...payload,
        });
        report.appointments.created++;
      } else {
        Object.assign(appt, payload);
        await appt.save();
        report.appointments.updated++;
      }
      appointmentMap[aDef.appointmentCode] = appt;
    }

    console.log(`    Appointments provisioned: ${report.appointments.created} created, ${report.appointments.updated} updated.`);

    // --------------------------------------------------
    // STEP 5: Seed Clinical Consultations & Prescriptions
    // --------------------------------------------------
    console.log("\n--> 5. Seeding Clinical Encounters & Prescriptions...");

    const apt001 = appointmentMap["APT-2026-001"]; // Ananya Mishra & Dr. Aarav Sharma
    if (apt001) {
      let consultation = await Consultation.findOne({ appointmentId: apt001._id });
      const consultData = {
        patientId: apt001.patientId,
        doctorId: apt001.doctorId,
        chiefComplaints: "Morning sneezing bursts (10-15 sneezes), watery rhinorrhoea, acrid nasal discharge, frontal headache aggravated by reading.",
        examinationNotes: "Bilateral inferior turbinates mildly hypertrophied and pale. Mild infraorbital allergic shiners. Throat clear.",
        diagnosis: "Allergic Rhinitis with Vasomotor Component and Tension Headache",
        treatmentPlan: "Classical Homoeopathy: Constitutional remedy (Allium Cepa & Natrum Mur) along with acute symptom relief. Advised salt water gargles.",
        followUpAdvice: "Review after 14 days or earlier in case of acute aggravation.",
        isFinalized: true,
        finalizedAt: new Date(),
      };

      if (!consultation) {
        consultation = await Consultation.create({
          appointmentId: apt001._id,
          ...consultData,
        });
        report.consultations.created++;
      } else {
        Object.assign(consultation, consultData);
        await consultation.save();
        report.consultations.updated++;
      }

      // Prescription for Consultation
      let rx = await Prescription.findOne({ consultationId: consultation._id });
      const rxData = {
        patientId: apt001.patientId,
        doctorId: apt001.doctorId,
        medications: [
          {
            name: "Allium Cepa",
            dosage: "30C",
            frequency: "Twice daily",
            duration: "14 days",
            instructions: "Take 4 pills dry on clean tongue 30 mins before breakfast and dinner.",
          },
          {
            name: "Natrum Muriaticum",
            dosage: "200CH",
            frequency: "Once a week (Sunday morning)",
            duration: "2 weeks",
            instructions: "Take 4 pills dry upon waking up on an empty stomach.",
          },
          {
            name: "Euphrasia Officinalis Eye Drops",
            dosage: "1-2 drops",
            frequency: "SOS",
            duration: "As needed",
            instructions: "Instill 1 drop in both eyes if burning or lachrymation occurs.",
          },
        ],
        dietaryAdvice: "Avoid iced water, citrus juices after sunset, and direct exposure to cold drafts from air conditioners.",
        specialInstructions: "Maintain a daily symptom diary noting sneezing frequency.",
        isReleasedToPatient: true,
      };

      if (!rx) {
        rx = await Prescription.create({
          consultationId: consultation._id,
          ...rxData,
        });
        report.prescriptions.created++;
      } else {
        Object.assign(rx, rxData);
        await rx.save();
        report.prescriptions.updated++;
      }
    }

    console.log(`    Clinical records provisioned: ${report.consultations.created} consultations, ${report.prescriptions.created} prescriptions.`);

    // --------------------------------------------------
    // STEP 6: Seed CRM Pipeline (12 Leads, Notes, Tasks)
    // --------------------------------------------------
    console.log("\n--> 6. Seeding CRM Pipeline (12 Leads with Follow-ups & Notes)...");

    const userPriya = userMap["crm@trigyna.test"];
    const userSushil = userMap["admin@trigyna.test"];

    const leadDefinitions = [
      {
        phone: "9700000001",
        fullName: "Simran Kaur",
        email: "simran.kaur@synthetic.trigyna.test",
        serviceInterest: "Skin & Hair",
        consultationMode: "Online Video Consultation",
        source: "website_enquiry",
        status: "new",
        message: "Suffering from severe hair loss and dry scalp after moving cities. Looking for a natural consultation.",
        assignedTo: userPriya?._id,
        followUpDate: getRelativeDate(0, 16, 0), // Today pending follow-up 1
        notes: [
          {
            body: "Website inquiry received. Dispatched automated acknowledgement via SMS.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000002",
        fullName: "Ritu Sengupta",
        email: "ritu.sengupta@synthetic.trigyna.test",
        serviceInterest: "Women's Wellness",
        consultationMode: "In-Clinic Consultation",
        source: "google_ads",
        status: "contact_attempted",
        message: "Irregular periods and sudden weight gain. Recommended by friend to Dr. Harshali.",
        assignedTo: userPriya?._id,
        followUpDate: getRelativeDate(1, 11, 0), // Tomorrow pending follow-up 2
        notes: [
          {
            body: "Called at 11:30 AM; went to voicemail. Sent follow-up WhatsApp message.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000003",
        fullName: "Karan Johar",
        email: "karan.johar@synthetic.trigyna.test",
        serviceInterest: "Homoeopathy",
        consultationMode: "Online Video Consultation",
        source: "instagram",
        status: "contacted",
        message: "Chronic sinus congestion and morning lethargy. Want Dr. Aarav consultation.",
        assignedTo: userPriya?._id,
        followUpDate: getRelativeDate(2, 14, 0),
        notes: [
          {
            body: "Spoke with client. Highly motivated for non-steroidal natural treatment. Sending doctor slot list.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000004",
        fullName: "Nisha Agarwal",
        email: "nisha.agarwal@synthetic.trigyna.test",
        serviceInterest: "Women's Wellness",
        consultationMode: "In-Clinic Consultation",
        source: "meta_ads",
        status: "qualified",
        message: "Interested in holistic pre-conception wellness package.",
        assignedTo: userPriya?._id,
        followUpDate: getRelativeDate(3, 10, 0),
        notes: [
          {
            body: "Qualified lead: Budget confirmed, schedule aligned for next Tuesday visit.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000005",
        fullName: "Alok Bhasin",
        email: "alok.bhasin@synthetic.trigyna.test",
        serviceInterest: "Skin & Hair",
        consultationMode: "In-Clinic Consultation",
        source: "walk_in",
        status: "appointment_requested",
        message: "Scalp irritation and acute dandruff. Wants physical examination.",
        assignedTo: userSushil?._id,
        followUpDate: getRelativeDate(1, 15, 0),
        notes: [
          {
            body: "Walked into reception desk; requested slot with Dr. Rajesh Mehta for tomorrow afternoon.",
            createdBy: userSushil?._id,
          },
        ],
      },
      // 3 Converted leads linked to real patient charts
      {
        phone: "9820000001",
        fullName: "Meera Patel",
        email: "meera.patel@synthetic.trigyna.test",
        serviceInterest: "Women's Wellness",
        consultationMode: "In-Clinic Consultation",
        source: "website_enquiry",
        status: "converted",
        convertedPatientKey: "TR-1002",
        message: "PCOD query from landing page.",
        assignedTo: userPriya?._id,
        notes: [
          {
            body: "Converted to registered patient chart TR-1002. Appointment booked with Dr. Harshali.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9820000002",
        fullName: "Sunita Deshmukh",
        email: "sunita.deshmukh@synthetic.trigyna.test",
        serviceInterest: "Homoeopathy",
        consultationMode: "In-Clinic Consultation",
        source: "referral",
        status: "converted",
        convertedPatientKey: "TR-1003",
        message: "Referred by Dr. Sutar family friend.",
        assignedTo: userPriya?._id,
        notes: [
          {
            body: "Converted to patient chart TR-1003. In-clinic consultation scheduled.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9820000003",
        fullName: "Kavita Rao",
        email: "kavita.rao@synthetic.trigyna.test",
        serviceInterest: "Skin & Hair",
        consultationMode: "In-Clinic Consultation",
        source: "google_ads",
        status: "converted",
        convertedPatientKey: "TR-1004",
        message: "Hair loss clinic inquiry.",
        assignedTo: userPriya?._id,
        notes: [
          {
            body: "Converted to patient chart TR-1004. Consultation booked with Dr. Rajesh.",
            createdBy: userPriya?._id,
          },
        ],
      },
      // Additional leads to complete 12 varied pipeline items
      {
        phone: "9700000009",
        fullName: "Manish Chawla",
        email: "manish.chawla@synthetic.trigyna.test",
        serviceInterest: "Homoeopathy",
        consultationMode: "Online Video Consultation",
        source: "meta_ads",
        status: "closed",
        message: "Consulted for chronic migraine; completed 3-month course.",
        assignedTo: userPriya?._id,
        notes: [
          {
            body: "Course successfully completed; patient reported 90% reduction in headache episodes.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000010",
        fullName: "Rohan Deshpande",
        email: "rohan.deshpande@synthetic.trigyna.test",
        serviceInterest: "Skin & Hair",
        consultationMode: "Online Video Consultation",
        source: "instagram",
        status: "not_interested",
        message: "Looking for allopathic laser therapy only.",
        assignedTo: userPriya?._id,
        notes: [
          {
            body: "Client prefers immediate surgical allopathic treatment. Marked not interested.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000011",
        fullName: "Tanvi Kulkarni",
        email: "tanvi.kulkarni@synthetic.trigyna.test",
        serviceInterest: "Women's Wellness",
        consultationMode: "Online Video Consultation",
        source: "website_enquiry",
        status: "new",
        message: "Thyroid antibodies elevated; inquiring about homoeopathy management.",
        assignedTo: userPriya?._id,
        notes: [
          {
            body: "New web lead logged; pending initial counselor callback.",
            createdBy: userPriya?._id,
          },
        ],
      },
      {
        phone: "9700000012",
        fullName: "Varun Chopra",
        email: "varun.chopra@synthetic.trigyna.test",
        serviceInterest: "Homoeopathy",
        consultationMode: "In-Clinic Consultation",
        source: "google_ads",
        status: "qualified",
        message: "Seasonal asthma and dust allergy. Looking for Saturday morning slot.",
        assignedTo: userPriya?._id,
        followUpDate: getRelativeDate(2, 11, 0),
        notes: [
          {
            body: "Verified location: Vashi clinic is 10 mins from patient. Slot reserved tentatively.",
            createdBy: userPriya?._id,
          },
        ],
      },
    ];

    for (const lDef of leadDefinitions) {
      let lead = await Lead.findOne({ phone: lDef.phone });

      const lPayload = {
        fullName: lDef.fullName,
        email: lDef.email,
        serviceInterest: lDef.serviceInterest,
        consultationMode: lDef.consultationMode,
        source: lDef.source,
        status: lDef.status,
        message: lDef.message,
        assignedTo: lDef.assignedTo,
        followUpDate: lDef.followUpDate,
        notes: lDef.notes || [],
      };

      if (lDef.convertedPatientKey && patientMap[lDef.convertedPatientKey]) {
        lPayload.convertedPatientId = patientMap[lDef.convertedPatientKey]._id;
      }

      if (!lead) {
        lead = await Lead.create({
          phone: lDef.phone,
          ...lPayload,
        });
        report.leads.created++;
      } else {
        Object.assign(lead, lPayload);
        await lead.save();
        report.leads.updated++;
      }
    }

    console.log(`    CRM leads provisioned: ${report.leads.created} created, ${report.leads.updated} updated.`);

    // --------------------------------------------------
    // STEP 7: Seed HRMS (5 Employees, Attendance, Leaves)
    // --------------------------------------------------
    console.log("\n--> 7. Seeding HRMS Profiles & Staff Attendance...");

    const userHrms = userMap["hrms@trigyna.test"];
    const userReception = userMap["reception@trigyna.test"];
    const userDoctor = userMap["doctor@trigyna.test"];

    const employeeDefinitions = [
      {
        employeeCode: "EMP-001",
        userKey: "admin@trigyna.test",
        department: "Administration",
        designation: "Clinic Director & Operations Head",
        salary: 120000,
        status: "active",
      },
      {
        employeeCode: "EMP-002",
        userKey: "doctor@trigyna.test",
        department: "Clinical",
        designation: "Chief Consulting Homoeopath",
        salary: 150000,
        status: "active",
      },
      {
        employeeCode: "EMP-003",
        userKey: "crm@trigyna.test",
        department: "CRM",
        designation: "Patient Relationship Lead",
        salary: 45000,
        status: "active",
      },
      {
        employeeCode: "EMP-004",
        userKey: "hrms@trigyna.test",
        department: "HR",
        designation: "HR & Compliance Specialist",
        salary: 50000,
        status: "active",
      },
      {
        employeeCode: "EMP-005",
        userKey: "reception@trigyna.test",
        department: "Reception",
        designation: "Front Desk & Billing Executive",
        salary: 35000,
        status: "active",
      },
    ];

    const employeeMap = {};

    for (const eDef of employeeDefinitions) {
      const u = userMap[eDef.userKey];
      if (!u) continue;

      let emp = await Employee.findOne({ employeeCode: eDef.employeeCode });
      const ePayload = {
        userId: u._id,
        department: eDef.department,
        designation: eDef.designation,
        salary: eDef.salary,
        status: eDef.status,
      };

      if (!emp) {
        emp = await Employee.create({
          employeeCode: eDef.employeeCode,
          ...ePayload,
        });
        report.employees.created++;
      } else {
        Object.assign(emp, ePayload);
        await emp.save();
        report.employees.updated++;
      }
      employeeMap[eDef.employeeCode] = emp;
    }

    // Attendance records for past 3 days for employees
    const daysToSeed = [0, -1, -2]; // today, yesterday, 2 days ago

    for (const offset of daysToSeed) {
      const dateStr = getRelativeDateStr(offset);

      for (const empCode of Object.keys(employeeMap)) {
        const emp = employeeMap[empCode];
        if (!emp) continue;

        let att = await Attendance.findOne({ employeeId: emp._id, workDate: dateStr });
        const checkIn = getRelativeDate(offset, 9, 30);
        const checkOut = offset === 0 ? getRelativeDate(offset, 18, 0) : getRelativeDate(offset, 18, 15);

        const attPayload = {
          checkInTime: checkIn,
          checkOutTime: checkOut,
          totalHours: 8.5,
          status: "present",
        };

        if (!att) {
          att = await Attendance.create({
            employeeId: emp._id,
            workDate: dateStr,
            ...attPayload,
          });
          report.attendance.created++;
        } else {
          Object.assign(att, attPayload);
          await att.save();
          report.attendance.updated++;
        }
      }
    }

    // 2 Leave requests (1 approved, 1 pending)
    const empReception = employeeMap["EMP-005"]; // Rahul Gupta
    const empCrm = employeeMap["EMP-003"]; // Priya Verma

    if (empReception) {
      let l1 = await LeaveRequest.findOne({ employeeId: empReception._id, reason: "Family wedding in native place" });
      const l1Payload = {
        leaveType: "casual",
        startDate: getRelativeDate(5),
        endDate: getRelativeDate(7),
        reason: "Family wedding in native place",
        status: "approved",
        reviewedBy: userSushil?._id,
        reviewNote: "Approved with alternate front-desk handover.",
      };
      if (!l1) {
        await LeaveRequest.create({ employeeId: empReception._id, ...l1Payload });
        report.leaves.created++;
      } else {
        Object.assign(l1, l1Payload);
        await l1.save();
        report.leaves.updated++;
      }
    }

    if (empCrm) {
      let l2 = await LeaveRequest.findOne({ employeeId: empCrm._id, reason: "Mild viral fever and recovery rest" });
      const l2Payload = {
        leaveType: "sick",
        startDate: getRelativeDate(1),
        endDate: getRelativeDate(2),
        reason: "Mild viral fever and recovery rest",
        status: "pending",
      };
      if (!l2) {
        await LeaveRequest.create({ employeeId: empCrm._id, ...l2Payload });
        report.leaves.created++;
      } else {
        Object.assign(l2, l2Payload);
        await l2.save();
        report.leaves.updated++;
      }
    }

    console.log(`    HRMS provisioned: ${report.employees.created} employees, ${report.attendance.created} attendance logs, ${report.leaves.created} leaves.`);

    // --------------------------------------------------
    // STEP 8: Seed Invoices (8 Sample Invoices)
    // --------------------------------------------------
    console.log("\n--> 8. Seeding Sample Billing Invoices (8 Invoices)...");

    const invoiceDefinitions = [
      {
        invoiceNumber: "INV-2026-001",
        patientKey: "TR-1001", // Ananya Mishra
        appointmentCode: "APT-2026-001",
        doctorObj: docAarav,
        totalAmount: 800,
        status: "paid",
        paymentMethod: "upi",
        paidAt: getRelativeDate(0, 10, 45),
        items: [
          { description: "Doctor Consultation Fee (Senior Consultant)", amount: 800, quantity: 1 },
        ],
        notes: "Online video consultation fee settled via UPI.",
      },
      {
        invoiceNumber: "INV-2026-002",
        patientKey: "TR-1002", // Meera Patel
        appointmentCode: "APT-2026-002",
        doctorObj: docHarshali,
        totalAmount: 1400,
        status: "paid",
        paymentMethod: "card",
        paidAt: getRelativeDate(0, 11, 20),
        items: [
          { description: "Women's Wellness Consultation", amount: 700, quantity: 1 },
          { description: "Homoeopathic Bio-chemic Remedy Kit (1 Month)", amount: 700, quantity: 1 },
        ],
        notes: "POS card transaction at clinic counter.",
      },
      {
        invoiceNumber: "INV-2026-003",
        patientKey: "TR-1003", // Sunita Deshmukh
        appointmentCode: "APT-2026-003",
        doctorObj: docAarav,
        totalAmount: 800,
        status: "pending",
        paymentMethod: "none",
        items: [
          { description: "In-Clinic Homoeopathy Consultation", amount: 800, quantity: 1 },
        ],
        notes: "Payment pending at reception billing counter.",
      },
      {
        invoiceNumber: "INV-2026-004",
        patientKey: "TR-1004", // Kavita Rao
        appointmentCode: "APT-2026-004",
        doctorObj: docRajesh,
        totalAmount: 600,
        status: "pending",
        paymentMethod: "none",
        items: [
          { description: "Trichology & Scalp Examination", amount: 600, quantity: 1 },
        ],
        notes: "Scheduled appointment invoice issued.",
      },
      {
        invoiceNumber: "INV-2026-005",
        patientKey: "TR-1005", // Pooja Shinde
        appointmentCode: "APT-2026-005",
        doctorObj: docHarshali,
        totalAmount: 700,
        status: "pending",
        paymentMethod: "none",
        items: [
          { description: "Online Video Consultation", amount: 700, quantity: 1 },
        ],
        notes: "Payment link dispatched.",
      },
      {
        invoiceNumber: "INV-2026-006",
        patientKey: "TR-1007", // Vikram Malhotra
        appointmentCode: "APT-2026-007",
        doctorObj: docRajesh,
        totalAmount: 1100,
        status: "paid",
        paymentMethod: "upi",
        paidAt: getRelativeDate(-1, 16, 40),
        items: [
          { description: "Homoeopathy Consultation", amount: 600, quantity: 1 },
          { description: "Digestive Care Drops (Pack of 2)", amount: 500, quantity: 1 },
        ],
        notes: "Paid via GPay.",
      },
      {
        invoiceNumber: "INV-2026-007",
        patientKey: "TR-1008", // Sneha Kulkarni
        appointmentCode: "APT-2026-008",
        doctorObj: docHarshali,
        totalAmount: 700,
        status: "paid",
        paymentMethod: "cash",
        paidAt: getRelativeDate(-2, 10, 45),
        items: [
          { description: "In-Clinic Consultation Fee", amount: 700, quantity: 1 },
        ],
        notes: "Cash receipt issued at front desk.",
      },
      {
        invoiceNumber: "INV-2026-008",
        patientKey: "TR-1001", // Ananya Mishra - Followup Pack
        doctorObj: docAarav,
        totalAmount: 1200,
        status: "paid",
        paymentMethod: "upi",
        paidAt: getRelativeDate(-7, 12, 0),
        items: [
          { description: "Annual Wellness Membership & Rhinitis Monitoring", amount: 1200, quantity: 1 },
        ],
        notes: "Annual natural health subscription.",
      },
    ];

    for (const invDef of invoiceDefinitions) {
      const patient = patientMap[invDef.patientKey];
      if (!patient) continue;

      let appt = invDef.appointmentCode ? appointmentMap[invDef.appointmentCode] : undefined;

      let invoice = await Invoice.findOne({ invoiceNumber: invDef.invoiceNumber });
      const invPayload = {
        patientId: patient._id,
        appointmentId: appt?._id,
        doctorId: invDef.doctorObj?._id,
        totalAmount: invDef.totalAmount,
        status: invDef.status,
        paymentMethod: invDef.paymentMethod,
        paidAt: invDef.paidAt,
        items: invDef.items,
        notes: invDef.notes,
        currency: "INR",
      };

      if (!invoice) {
        invoice = await Invoice.create({
          invoiceNumber: invDef.invoiceNumber,
          ...invPayload,
        });
        report.invoices.created++;
      } else {
        Object.assign(invoice, invPayload);
        await invoice.save();
        report.invoices.updated++;
      }
    }

    console.log(`    Invoices provisioned: ${report.invoices.created} created, ${report.invoices.updated} updated.`);

    // --------------------------------------------------
    // STEP 9: Seed In-App Notifications
    // --------------------------------------------------
    console.log("\n--> 9. Seeding In-App Notifications for Roles...");

    const notificationDefinitions = [
      {
        recipientRole: "admin",
        title: "Daily Operations Review",
        message: "Real-time clinic dashboard updated with 10 appointments and 12 CRM pipeline leads.",
        type: "system",
        link: "/portal/admin",
      },
      {
        recipientRole: "doctor",
        recipientId: userDoctor?._id,
        title: "Upcoming Video Consultation",
        message: "You have an appointment today at 10:00 AM with Ananya Mishra.",
        type: "appointment",
        link: "/portal/doctor",
      },
      {
        recipientRole: "crm",
        recipientId: userPriya?._id,
        title: "Leads Pending Follow-up",
        message: "2 website inquiries require contact follow-up today.",
        type: "lead",
        link: "/portal/crm",
      },
      {
        recipientRole: "hrms",
        recipientId: userHrms?._id,
        title: "Leave Application Received",
        message: "Priya Verma has submitted a sick leave application for review.",
        type: "leave",
        link: "/portal/hrms",
      },
      {
        recipientRole: "reception",
        recipientId: userReception?._id,
        title: "Patient Check-in Reminder",
        message: "Sunita Deshmukh has arrived for 2:00 PM consultation.",
        type: "appointment",
        link: "/portal/reception",
      },
      {
        recipientRole: "patient",
        recipientId: userMap["patient@trigyna.test"]?._id,
        title: "Digital Prescription Released",
        message: "Dr. Aarav Sharma has released your verified homeopathic prescription.",
        type: "clinical",
        link: "/portal/patient",
      },
    ];

    for (const nDef of notificationDefinitions) {
      let notif = await Notification.findOne({
        title: nDef.title,
        recipientRole: nDef.recipientRole,
      });

      if (!notif) {
        await Notification.create(nDef);
        report.notifications.created++;
      } else {
        Object.assign(notif, nDef);
        await notif.save();
        report.notifications.updated++;
      }
    }

    console.log(`    Notifications provisioned: ${report.notifications.created} created, ${report.notifications.updated} updated.`);

    // --------------------------------------------------
    // STEP 10: Seeding Organization Profile & Facilities
    // --------------------------------------------------
    console.log("\n--> 10. Seeding Organization Profile & Facilities...");
    let org = await Organization.findOne();
    if (!org) {
      await Organization.create({
        name: "TriGyna Healthcare & Wellness",
        tagline: "Women | Health | Wellness",
        email: "trigyna.health@gmail.com",
        phone: "+919172772326",
        branches: [
          {
            branchCode: "BR-01",
            name: "Flagship Indiranagar Centre",
            phone: "+919172772326",
            email: "indiranagar@trigyna.com",
            address: "100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038",
            operatingHours: "08:00 - 20:00",
            status: "active",
          },
          {
            branchCode: "BR-02",
            name: "Koramangala Specialty Clinic",
            phone: "+918012345678",
            email: "koramangala@trigyna.com",
            address: "80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034",
            operatingHours: "09:00 - 19:00",
            status: "active",
          },
        ],
        departments: [
          { code: "GYN", name: "Gynecology & Obstetrics", description: "Comprehensive female reproductive healthcare", headOfDepartment: "Dr. Aarav Sharma", status: "active" },
          { code: "DERM", name: "Dermatology & Cosmetology", description: "Skin, hair and aesthetic health", headOfDepartment: "Dr. Harshali Sutar", status: "active" },
          { code: "WELL", name: "Reproductive & Hormonal Wellness", description: "PCOS, fertility and holistic endocrine health", headOfDepartment: "Dr. Rajesh Mehta", status: "active" },
        ],
        services: [
          { code: "SRV-GYN-01", name: "Comprehensive Gynecological Consultation", department: "Gynecology & Obstetrics", durationMinutes: 30, baseFee: 1200, consultationType: "both", status: "active" },
          { code: "SRV-PCOS-01", name: "PCOS & Metabolic Health Evaluation", department: "Reproductive & Hormonal Wellness", durationMinutes: 45, baseFee: 1500, consultationType: "both", status: "active" },
          { code: "SRV-DERM-01", name: "Clinical Dermatology & Hair Analysis", department: "Dermatology & Cosmetology", durationMinutes: 30, baseFee: 1000, consultationType: "both", status: "active" },
          { code: "SRV-ANTE-01", name: "Antenatal Trimester Checkup", department: "Gynecology & Obstetrics", durationMinutes: 30, baseFee: 1400, consultationType: "in_person", status: "active" },
        ],
      });
      console.log("    Organization profile and facilities created.");
    } else {
      console.log("    Organization profile verified active.");
    }

    // Seeding Operational Expenses
    console.log("\n--> Seeding Operational Expenses...");
    const sampleExpenses = [
      {
        expenseNumber: "EXP-2026-1001",
        title: "Medical Diagnostic Consumables & Lab Kits",
        category: "Medical Supplies",
        amount: 14500,
        vendor: "BioMed Supplies Ltd",
        expenseDate: getRelativeDateStr(-5),
        paymentMethod: "bank_transfer",
        status: "paid",
      },
      {
        expenseNumber: "EXP-2026-1002",
        title: "Facility High-Speed Fiber Internet & Tele-Consultation Licenses",
        category: "Utilities",
        amount: 4800,
        vendor: "Airtel Enterprise",
        expenseDate: getRelativeDateStr(-8),
        paymentMethod: "card",
        status: "paid",
      },
      {
        expenseNumber: "EXP-2026-1003",
        title: "Indiranagar Centre Clinic Monthly Lease",
        category: "Rent",
        amount: 85000,
        vendor: "Brigade Properties",
        expenseDate: getRelativeDateStr(-15),
        paymentMethod: "bank_transfer",
        status: "paid",
      },
    ];

    for (const exp of sampleExpenses) {
      await Expense.findOneAndUpdate(
        { expenseNumber: exp.expenseNumber },
        exp,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`    Operational expenses provisioned: ${sampleExpenses.length} records.`);

    // Seeding Monthly Payroll Runs for Employees
    console.log("\n--> Seeding Monthly Payroll Runs (Period 2026-10)...");
    const activeStaff = await Employee.find({ status: "active" });
    for (const emp of activeStaff) {
      const baseSalary = emp.salary || 35000;
      const allowances = {
        hra: Math.round(baseSalary * 0.2),
        medical: 1500,
        special: Math.round(baseSalary * 0.1),
      };
      const totalAllowances = allowances.hra + allowances.medical + allowances.special;
      const grossPay = baseSalary + totalAllowances;
      const deductions = {
        providentFund: Math.round(baseSalary * 0.12),
        professionalTax: 200,
        tds: Math.round(grossPay * 0.05),
      };
      const totalDeductions = deductions.providentFund + deductions.professionalTax + deductions.tds;
      const netPay = grossPay - totalDeductions;

      await Payroll.findOneAndUpdate(
        { payrollPeriod: "2026-10", employeeId: emp._id },
        {
          payrollPeriod: "2026-10",
          employeeId: emp._id,
          baseSalary,
          allowances,
          deductions,
          workedDays: 26,
          leaveDays: 0,
          grossPay,
          netPay,
          status: "approved",
          paymentRef: `SAL-202610-${emp.employeeCode}`,
          paymentDate: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`    Payroll runs provisioned for ${activeStaff.length} employees.`);

    // Seeding Attendance Correction Request
    const sampleEmp = activeStaff[0];
    if (sampleEmp) {
      await AttendanceCorrection.findOneAndUpdate(
        { employeeId: sampleEmp._id, workDate: getRelativeDateStr(-2) },
        {
          employeeId: sampleEmp._id,
          workDate: getRelativeDateStr(-2),
          requestedCheckIn: getRelativeDate(-2, 9, 0),
          requestedCheckOut: getRelativeDate(-2, 17, 30),
          reason: "Biometric sensor glitch during evening check-out",
          status: "pending",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log("    Attendance correction request provisioned.");
    }

    // --------------------------------------------------
    // STEP 11: Legitimate Audit Log
    // --------------------------------------------------
    await recordAudit({
      actorRole: "system",
      action: "DEV_DATA_SEEDED",
      targetEntity: "DatabaseSeed",
      details: {
        summary: "Synthetic development data seeded successfully across all modules.",
        users: report.users,
        doctors: report.doctors,
        patients: report.patients,
        appointments: report.appointments,
        leads: report.leads,
        invoices: report.invoices,
      },
    });

    console.log("\n==================================================");
    console.log("SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==================================================");
    console.table({
      "User Accounts": `${report.users.created} new / ${report.users.updated} verified`,
      "Doctor Profiles": `${report.doctors.created} new / ${report.doctors.updated} verified`,
      "Patients": `${report.patients.created} new / ${report.patients.updated} verified`,
      "Appointments": `${report.appointments.created} new / ${report.appointments.updated} verified`,
      "Consultations": `${report.consultations.created} new / ${report.consultations.updated} verified`,
      "Prescriptions": `${report.prescriptions.created} new / ${report.prescriptions.updated} verified`,
      "CRM Leads": `${report.leads.created} new / ${report.leads.updated} verified`,
      "Employees": `${report.employees.created} new / ${report.employees.updated} verified`,
      "Attendance": `${report.attendance.created} new / ${report.attendance.updated} verified`,
      "Leave Requests": `${report.leaves.created} new / ${report.leaves.updated} verified`,
      "Billing Invoices": `${report.invoices.created} new / ${report.invoices.updated} verified`,
      "Notifications": `${report.notifications.created} new / ${report.notifications.updated} verified`,
    });

  } catch (error) {
    console.error("[Seed] Critical failure during database seeding:", error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runSeed;

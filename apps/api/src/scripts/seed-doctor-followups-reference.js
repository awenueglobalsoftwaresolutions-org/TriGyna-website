const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const FollowUp = require("../modules/clinical/followup.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const User = require("../modules/users/user.model");

async function seedFollowUpsReference() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB:", uri);

  // 1. Doctor Ananya Sharma
  const doctorUser = await User.findOne({ email: "ananya.sharma@trigyna.test" });
  if (!doctorUser) {
    console.error("Doctor user not found!");
    process.exit(1);
  }
  const doctor = await Doctor.findOne({ userId: doctorUser._id });
  if (!doctor) {
    console.error("Doctor profile not found!");
    process.exit(1);
  }

  // 2. Reference Patients mapping from the screenshot
  const referencePatientsData = [
    { fullName: "Sunita Deshmukh", patientCode: "TG0023", phone: "+91 98200 10023", gender: "female", age: 31, bloodGroup: "B+", service: "PCOS Management" },
    { fullName: "Neha Singh", patientCode: "TG0016", phone: "+91 98200 10016", gender: "female", age: 28, bloodGroup: "O+", service: "Hormonal Imbalance" },
    { fullName: "Sanya Khanna", patientCode: "TG10235", phone: "+91 98200 10235", gender: "female", age: 32, bloodGroup: "A+", service: "Weight Management" },
    { fullName: "Neha Patel", patientCode: "TG10238", phone: "+91 98200 10238", gender: "female", age: 29, bloodGroup: "AB+", service: "PCOD / PCOS" },
    { fullName: "Kavya Mehta", patientCode: "TG0020", phone: "+91 98200 10020", gender: "female", age: 26, bloodGroup: "B+", service: "Skin & Hair Care" },
    { fullName: "Pooja Rawat", patientCode: "TG10236", phone: "+91 98200 10236", gender: "female", age: 27, bloodGroup: "O+", service: "Irregular Periods" },
    { fullName: "Ritika Sharma", patientCode: "TG10237", phone: "+91 98200 10237", gender: "female", age: 34, bloodGroup: "B+", service: "Diet & Nutrition" },
    { fullName: "Aarti Singh", patientCode: "TG10239", phone: "+91 98200 10239", gender: "female", age: 35, bloodGroup: "A+", service: "Hormonal Imbalance" },
    { fullName: "Aditi Mehra", patientCode: "TG10240", phone: "+91 98200 10240", gender: "female", age: 29, bloodGroup: "O+", service: "Fertility Care" },
    { fullName: "Meenal Jain", patientCode: "TG10241", phone: "+91 98200 10241", gender: "female", age: 30, bloodGroup: "B+", service: "Skin & Hair Care" },
    { fullName: "Kavita Sharma", patientCode: "TG10242", phone: "+91 98200 10242", gender: "female", age: 33, bloodGroup: "AB+", service: "PCOS Care" },
    { fullName: "Pooja Deshmukh", patientCode: "TG10243", phone: "+91 98200 10243", gender: "female", age: 28, bloodGroup: "A+", service: "Hormonal Balance" },
  ];

  const patientMap = {};
  for (const pData of referencePatientsData) {
    let p = await Patient.findOne({ patientCode: pData.patientCode });
    if (!p) {
      p = await Patient.findOne({ fullName: pData.fullName });
    }
    if (!p) {
      p = await Patient.create(pData);
    } else {
      p.fullName = pData.fullName;
      p.service = pData.service;
      p.patientCode = pData.patientCode;
      await p.save();
    }
    patientMap[pData.patientCode] = p;
  }

  // Base date = Friday 13 Nov 2026
  const baseDate = new Date("2026-11-13T09:00:00.000Z");

  // Clean existing follow-ups for this doctor
  await FollowUp.deleteMany({ doctorId: doctor._id });

  // 42 follow-ups exact list:
  // Row 1: Sunita Deshmukh - Today (Nov 13) - Completed
  // Row 2: Neha Singh - Tomorrow (Nov 14) - Pending
  // Row 3: Sanya Khanna - In 3 days (Nov 16) - Pending
  // Row 4: Neha Patel - In 5 days (Nov 18) - Scheduled
  // Row 5: Kavya Mehta - In 7 days (Nov 20) - Scheduled
  // Row 6: Pooja Rawat - In 8 days (Nov 21) - Scheduled
  // Row 7: Ritika Sharma - In 9 days (Nov 22) - Scheduled
  // (Scheduled count in next 7 days = Neha Patel + Kavya Mehta + Pooja Rawat + Ritika Sharma = 4 scheduled)
  
  // 3 Overdue cases (past dates, incomplete)
  // 13 more Pending cases (scheduled later)
  // 19 more Completed cases (past dates)
  // Total = 1 (Sunita) + 19 completed = 20 Completed
  // Total Pending = 2 (Neha Singh + Sanya Khanna) + 3 (Overdue) + 13 (Future pending) = 18 Pending
  // Total Scheduled = 4 Scheduled (Upcoming next 7 days)
  // Grand Total = 20 + 18 + 4 = 42 Total Follow-ups!

  const followUpConfigs = [
    // 1. Sunita Deshmukh - Today
    {
      patientCode: "TG0023",
      reason: "PCOS Management",
      description: "Review symptoms & medication response",
      type: "Review",
      status: "completed",
      daysOffset: 0, // Fri, 13 Nov 2026 (Today)
      scheduledTime: "10:30 AM",
      priority: "Routine",
      outcome: "Symptoms improved significantly",
      recoveryStatus: "Improved",
      completionNotes: "Patient reports regular menstrual cycles and reduced pelvic discomfort. Prescribed maintenance posology.",
    },
    // 2. Neha Singh - Tomorrow
    {
      patientCode: "TG0016",
      reason: "Hormonal Imbalance",
      description: "Follow-up for lab reports & treatment plan",
      type: "Test Review",
      status: "pending",
      daysOffset: 1, // Sat, 14 Nov 2026 (Tomorrow)
      scheduledTime: "11:15 AM",
      priority: "Medium",
      outcome: "",
      recoveryStatus: "Requires Review",
      completionNotes: "",
    },
    // 3. Sanya Khanna - In 3 days
    {
      patientCode: "TG10235",
      reason: "Weight Management",
      description: "Diet & lifestyle progress review",
      type: "Progress",
      status: "pending",
      daysOffset: 3, // Mon, 16 Nov 2026 (In 3 days)
      scheduledTime: "02:00 PM",
      priority: "Medium",
      outcome: "",
      recoveryStatus: "Improved",
      completionNotes: "",
    },
    // 4. Neha Patel - In 5 days
    {
      patientCode: "TG10238",
      reason: "PCOD / PCOS",
      description: "Post-consultation follow-up",
      type: "Review",
      status: "scheduled",
      daysOffset: 5, // Wed, 18 Nov 2026 (In 5 days)
      scheduledTime: "12:00 PM",
      priority: "Routine",
      outcome: "",
      recoveryStatus: "Pending Review",
      completionNotes: "",
    },
    // 5. Kavya Mehta - In 7 days
    {
      patientCode: "TG0020",
      reason: "Skin & Hair Care",
      description: "Treatment response & next steps",
      type: "Progress",
      status: "scheduled",
      daysOffset: 7, // Fri, 20 Nov 2026 (In 7 days)
      scheduledTime: "04:30 PM",
      priority: "Routine",
      outcome: "",
      recoveryStatus: "Pending Review",
      completionNotes: "",
    },
    // 6. Pooja Rawat - In 8 days
    {
      patientCode: "TG10236",
      reason: "Irregular Periods",
      description: "Menstrual cycle logging check",
      type: "Review",
      status: "scheduled",
      daysOffset: 8,
      scheduledTime: "11:00 AM",
      priority: "Routine",
    },
    // 7. Ritika Sharma - In 9 days
    {
      patientCode: "TG10237",
      reason: "Diet & Nutrition",
      description: "Nutritional intake and compliance check",
      type: "Medication Review",
      status: "scheduled",
      daysOffset: 9,
      scheduledTime: "03:15 PM",
      priority: "Routine",
    },

    // 3 Overdue follow-ups
    {
      patientCode: "TG10239",
      reason: "Hormonal Imbalance",
      description: "Thyroid & prolactin blood panel review overdue",
      type: "Test Review",
      status: "pending",
      daysOffset: -3, // Nov 10 (Overdue)
      scheduledTime: "10:00 AM",
      priority: "High",
    },
    {
      patientCode: "TG10240",
      reason: "Fertility Care",
      description: "Follicular scan ultrasound review overdue",
      type: "Investigation Review",
      status: "pending",
      daysOffset: -5, // Nov 8 (Overdue)
      scheduledTime: "11:30 AM",
      priority: "Urgent",
    },
    {
      patientCode: "TG10241",
      reason: "Skin & Hair Care",
      description: "Acne flare up review missed",
      type: "Review",
      status: "pending",
      daysOffset: -2, // Nov 11 (Overdue)
      scheduledTime: "04:00 PM",
      priority: "High",
    },
  ];

  const clinicalConditions = [
    { reason: "PCOS Management", desc: "Review ultrasound & LH:FSH ratio", type: "Review" },
    { reason: "Hormonal Imbalance", desc: "Evaluate evening fatigue and cycle irregularity", type: "Test Review" },
    { reason: "Weight Management", desc: "Metabolic rate & visceral fat percentage review", type: "Progress" },
    { reason: "PCOD / PCOS", desc: "Insulin sensitivity & lifestyle modifications", type: "Review" },
    { reason: "Skin & Hair Care", desc: "Evaluation of scalp density & hormonal acne", type: "Progress" },
    { reason: "Diet & Nutrition", desc: "Anti-inflammatory dietary protocol review", type: "Medication Review" },
  ];

  const patientKeys = Object.keys(patientMap);

  // 19 more Completed follow-ups (past dates, completed)
  for (let i = 0; i < 19; i++) {
    const pKey = patientKeys[(i + 1) % patientKeys.length];
    const c = clinicalConditions[i % clinicalConditions.length];
    followUpConfigs.push({
      patientCode: pKey,
      reason: c.reason,
      description: c.desc,
      type: c.type,
      status: "completed",
      daysOffset: -(i + 1) * 2, // 2 to 38 days ago
      scheduledTime: `${10 + (i % 6)}:00 AM`,
      priority: "Routine",
      outcome: "Treatment Goals Met",
      recoveryStatus: "Improved",
      completionNotes: `Clinical cycle reviewed. Patient adhering well to holistic homoeopathic treatment.`,
    });
  }

  // 13 more Pending follow-ups (future dates > 7 days, status pending review)
  for (let i = 0; i < 13; i++) {
    const pKey = patientKeys[(i + 4) % patientKeys.length];
    const c = clinicalConditions[(i + 3) % clinicalConditions.length];
    followUpConfigs.push({
      patientCode: pKey,
      reason: c.reason,
      description: c.desc,
      type: c.type,
      status: "pending",
      daysOffset: 10 + i * 2, // 10 to 36 days ahead
      scheduledTime: `${11 + (i % 5)}:00 AM`,
      priority: i % 2 === 0 ? "Medium" : "Routine",
      outcome: "",
      recoveryStatus: "Requires Review",
      completionNotes: "",
    });
  }

  console.log(`Generated ${followUpConfigs.length} follow-up configs. Seeding MongoDB...`);

  let seq = 200;
  for (const cfg of followUpConfigs) {
    seq++;
    const patient = patientMap[cfg.patientCode] || patientMap["TG0023"];
    const dueDate = new Date(baseDate.getTime() + (cfg.daysOffset || 0) * 24 * 60 * 60 * 1000);
    const code = `FLW-2026-${seq}`;

    await FollowUp.create({
      followUpCode: code,
      patientId: patient._id,
      doctorId: doctor._id,
      serviceName: cfg.reason,
      reason: cfg.reason,
      description: cfg.description,
      type: cfg.type || "Review",
      dueDate,
      scheduledTime: cfg.scheduledTime || "11:00 AM",
      mode: "Online Video Consultation",
      interval: "Day 14",
      planInstructions: cfg.description,
      status: cfg.status,
      priority: cfg.priority || "Routine",
      outcome: cfg.outcome || "",
      recoveryStatus: cfg.recoveryStatus || "Pending Review",
      completionNotes: cfg.completionNotes || "",
      completedAt: cfg.status === "completed" ? new Date(dueDate.getTime() + 30 * 60 * 1000) : undefined,
      completedBy: cfg.status === "completed" ? doctorUser._id : undefined,
      reminderPreferences: {
        whatsappEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
      },
      reminders: [
        {
          channel: "whatsapp",
          status: cfg.status === "completed" ? "delivered" : "scheduled",
          scheduledFor: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000),
          recipient: patient.phone || "+91 98200 10000",
          content: `Dear ${patient.fullName}, reminder for your TriGyna follow-up with Dr. Ananya Sharma on ${dueDate.toLocaleDateString()}.`,
        },
      ],
    });
  }

  doctor.followUpSettings = {
    defaultInterval: "Day 14",
    defaultType: "Review",
    autoRemindWhatsApp: true,
    autoRemindEmail: true,
    autoRemindPush: true,
    leadTimeDays: 2,
    allowDirectBooking: true,
    preferredConsultationMode: "Online Video Consultation",
  };
  await doctor.save();

  console.log("=== SEEDING COMPLETED SUCCESSFULLY! ===");
  const total = await FollowUp.countDocuments({ doctorId: doctor._id });
  const completed = await FollowUp.countDocuments({ doctorId: doctor._id, status: "completed" });
  const pending = await FollowUp.countDocuments({ doctorId: doctor._id, status: "pending" });
  const scheduled = await FollowUp.countDocuments({ doctorId: doctor._id, status: "scheduled" });
  console.log(`Counts -> Total: ${total}, Completed: ${completed}, Pending: ${pending}, Scheduled: ${scheduled}`);

  await mongoose.disconnect();
}

seedFollowUpsReference().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

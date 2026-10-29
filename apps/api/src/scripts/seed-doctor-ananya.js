const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const FollowUp = require("../modules/clinical/followup.model");
const Task = require("../modules/tasks/task.model");
const Notification = require("../modules/notifications/notification.model");
const AuditLog = require("../modules/audit/audit.model");

async function seedDoctorAnanya() {
  console.log("Connecting to MongoDB for Doctor Ananya seeding...");
  await mongoose.connect(env.MONGODB_URI);

  try {
    const passwordHash = await User.hashPassword("TriGyna@123");

    // 1. User
    let user = await User.findOne({ email: "ananya.sharma@trigyna.test" });
    if (!user) {
      user = await User.create({
        name: "Dr. Ananya Sharma",
        email: "ananya.sharma@trigyna.test",
        phone: "9000000010",
        passwordHash,
        role: "doctor",
        status: "active",
      });
      console.log("Created user: Dr. Ananya Sharma");
    } else {
      user.passwordHash = passwordHash;
      user.role = "doctor";
      user.status = "active";
      await user.save();
      console.log("Updated user: Dr. Ananya Sharma");
    }

    // 2. Doctor Profile
    let doctor = await Doctor.findOne({ userId: user._id });
    const doctorData = {
      userId: user._id,
      specialization: ["Obstetrician & Gynecologist", "Antenatal & Maternal Care", "Fertility & Reproductive Health"],
      qualifications: "MS, DGO (Obstetrician & Gynecologist)",
      consultationFee: 800,
      bio: "Senior consultant with 12+ years experience in obstetrics, fertility, and high-risk pregnancy care.",
      status: "active",
      workingHours: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 6, startTime: "09:00", endTime: "16:00", slotDurationMinutes: 30 },
      ],
    };

    if (!doctor) {
      doctor = await Doctor.create(doctorData);
      console.log("Created Doctor profile for Dr. Ananya Sharma");
    } else {
      Object.assign(doctor, doctorData);
      await doctor.save();
      console.log("Updated Doctor profile for Dr. Ananya Sharma");
    }

    // 3. Patients (Exact names and codes from reference design)
    const patientDefs = [
      { patientCode: "TG0012", fullName: "Sneha Kapoor", age: 28, gender: "female", phone: "9820010012", bloodGroup: "B+", allergies: ["Dust"], medicalHistory: "Primigravida, 24 weeks gestation. Blood pressure normal." },
      { patientCode: "TG0013", fullName: "Pooja Rathi", age: 32, gender: "female", phone: "9820010013", bloodGroup: "O+", allergies: [], medicalHistory: "History of secondary amenorrhoea and polycystic ovarian morphology." },
      { patientCode: "TG0014", fullName: "Meera Tandon", age: 26, gender: "female", phone: "9820010014", bloodGroup: "A+", allergies: ["Sulfa"], medicalHistory: "Pre-conception counseling and routine gynaecological wellness check." },
      { patientCode: "TG0015", fullName: "Aditi Khanna", age: 30, gender: "female", phone: "9820010015", bloodGroup: "AB+", allergies: [], medicalHistory: "Subfertility evaluation, follicular tracking and hormonal profiling." },
      { patientCode: "TG0016", fullName: "Neha Singh", age: 34, gender: "female", phone: "9820010016", bloodGroup: "O-", allergies: ["Penicillin"], medicalHistory: "Second trimester antenatal check, gestational glucose screening pending." },
      { patientCode: "TG0017", fullName: "Riya Patel", age: 29, gender: "female", phone: "9820010017", bloodGroup: "B-", allergies: [], medicalHistory: "Endometriosis Grade I, managed with classical constitutional remedy." },
      { patientCode: "TG0018", fullName: "Sonal Gupta", age: 33, gender: "female", phone: "9820010018", bloodGroup: "A-", allergies: [], medicalHistory: "Antenatal follow-up, 18 weeks. Routine fetal anatomy ultrasound planned." },
      { patientCode: "TG0019", fullName: "Priya Kaur", age: 27, gender: "female", phone: "9820010019", bloodGroup: "B+", allergies: [], medicalHistory: "Dysmenorrhea and pelvic cramping on Day 1 of menses." },
      { patientCode: "TG0020", fullName: "Kavya Mehta", age: 31, gender: "female", phone: "9820010020", bloodGroup: "O+", allergies: [], medicalHistory: "Hypothyroidism, on Thyroxine 50mcg. Repeat TSH and lipid panel review." },
      { patientCode: "TG0021", fullName: "Ritu Sharma", age: 29, gender: "female", phone: "9820010021", bloodGroup: "AB-", allergies: [], medicalHistory: "Post laparoscopic cystectomy check, surgical wound clean and healed." },
      { patientCode: "TG0022", fullName: "Anjali Verma", age: 35, gender: "female", phone: "9820010022", bloodGroup: "A+", allergies: [], medicalHistory: "Ovulation induction protocol, follicular scan on day 12." },
      { patientCode: "TG0023", fullName: "Sunita Deshmukh", age: 46, gender: "female", phone: "9820010023", bloodGroup: "O+", allergies: [], medicalHistory: "Perimenopause symptoms, hot flushes and vasomotor stability." },
    ];

    const patientMap = {};
    for (const p of patientDefs) {
      let patient = await Patient.findOne({ patientCode: p.patientCode });
      if (!patient) {
        patient = await Patient.create({ ...p, status: "active" });
      } else {
        Object.assign(patient, p);
        await patient.save();
      }
      patientMap[p.patientCode] = patient;
    }
    console.log(`Ensured ${Object.keys(patientMap).length} patients with TG-codes`);

    // 4. Appointments (reference date 2026-10-26 and current day)
    const todayStr = new Date().toISOString().split("T")[0];
    const targetDates = Array.from(new Set([todayStr, "2026-10-26"]));

    // Reference layout appointments
    const appointmentDefs = [
      { code: "TG-A-1012", patientKey: "TG0012", service: "Antenatal Checkup", time: "09:00", endTime: "09:30", status: "completed" },
      { code: "TG-A-1013", patientKey: "TG0013", service: "Follow-up Visit", time: "09:30", endTime: "10:00", status: "in_consultation" },
      { code: "TG-A-1014", patientKey: "TG0014", service: "General Consultation", time: "10:00", endTime: "10:30", status: "waiting" },
      { code: "TG-A-1015", patientKey: "TG0015", service: "Fertility Consultation", time: "10:30", endTime: "11:00", status: "checked_in" },
      { code: "TG-A-1016", patientKey: "TG0016", service: "Antenatal Checkup", time: "11:00", endTime: "11:30", status: "scheduled" },
      { code: "TG-A-1017", patientKey: "TG0017", service: "Follow-up Visit", time: "11:30", endTime: "12:00", status: "in_consultation" },
      { code: "TG-A-1018", patientKey: "TG0018", service: "Antenatal Checkup", time: "12:00", endTime: "12:30", status: "checked_in" },
      { code: "TG-A-1019", patientKey: "TG0019", service: "General Consultation", time: "12:30", endTime: "13:00", status: "scheduled" },
      { code: "TG-A-1020", patientKey: "TG0020", service: "Fertility Consultation", time: "14:00", endTime: "14:30", status: "completed" },
      { code: "TG-A-1021", patientKey: "TG0021", service: "General Consultation", time: "14:30", endTime: "15:00", status: "completed" },
      { code: "TG-A-1022", patientKey: "TG0022", service: "Antenatal Checkup", time: "15:00", endTime: "15:30", status: "completed" },
      { code: "TG-A-1023", patientKey: "TG0023", service: "Follow-up Visit", time: "15:30", endTime: "16:00", status: "completed" },
    ];

    const apptMap = {};
    for (const targetDate of targetDates) {
      for (const a of appointmentDefs) {
        const patient = patientMap[a.patientKey];
        if (!patient) continue;

        const apptCode = targetDate === "2026-10-26" ? a.code : `${a.code}-${targetDate}`;
        let appt = await Appointment.findOne({ appointmentCode: apptCode });
        const payload = {
          patientId: patient._id,
          doctorId: doctor._id,
          serviceName: a.service,
          appointmentDate: targetDate,
          startTime: a.time,
          endTime: a.endTime,
          mode: "In-Clinic Consultation",
          status: a.status,
          paymentStatus: a.status === "completed" ? "paid" : "unpaid",
          checkedInAt: a.status === "waiting" || a.status === "checked_in" || a.status === "in_consultation" ? new Date(Date.now() - 15 * 60000) : undefined,
          completedAt: a.status === "completed" ? new Date(Date.now() - 30 * 60000) : undefined,
        };

        if (!appt) {
          appt = await Appointment.create({ appointmentCode: apptCode, ...payload });
        } else {
          Object.assign(appt, payload);
          await appt.save();
        }
        apptMap[apptCode] = appt;
      }
    }
    console.log(`Ensured 12 appointments for dates: ${targetDates.join(", ")}`);

    // 5. Seed Consultations & Prescriptions
    // Sneha Kapoor - Finalized consultation with prescription
    const apptSneha = apptMap["TG-A-1012"];
    if (apptSneha) {
      let consultSneha = await Consultation.findOne({ appointmentId: apptSneha._id });
      const consultData = {
        appointmentId: apptSneha._id,
        patientId: apptSneha.patientId,
        doctorId: doctor._id,
        chiefComplaints: "Routine 24-week antenatal evaluation. Reports good fetal movement, no abdominal pain or bleeding.",
        examinationNotes: "Fundal height corresponds to 24 weeks. Fetal heart rate 142 bpm regular. Blood pressure 114/74 mmHg. No pedal edema.",
        diagnosis: "Single live intrauterine pregnancy at 24 weeks with normal maternal-fetal parameters.",
        treatmentPlan: "Continue maternal calcium & iron supplementation. Maintain pelvic floor stretches and adequate dietary protein.",
        followUpAdvice: "Next antenatal visit in 4 weeks. Repeat complete hemogram and glucose challenge test.",
        isFinalized: true,
        finalizedAt: new Date(Date.now() - 3600000),
      };
      if (!consultSneha) {
        consultSneha = await Consultation.create(consultData);
      } else {
        Object.assign(consultSneha, consultData);
        await consultSneha.save();
      }

      // Prescription
      let prescSneha = await Prescription.findOne({ consultationId: consultSneha._id });
      const prescData = {
        consultationId: consultSneha._id,
        patientId: apptSneha.patientId,
        doctorId: doctor._id,
        medications: [
          { name: "Ferrous Ascorbate + Folic Acid", dosage: "100mg", frequency: "Once daily", duration: "30 days", instructions: "Take after lunch with water or citrus juice. Avoid tea/milk within 1 hr." },
          { name: "Calcium Carbonate + Vit D3", dosage: "500mg", frequency: "Twice daily", duration: "30 days", instructions: "Take after breakfast and dinner with warm water." },
          { name: "Calcarea Phosphorica 6X", dosage: "4 tablets", frequency: "Twice daily", duration: "30 days", instructions: "Dissolve on clean tongue 30 mins before food." },
        ],
        dietaryAdvice: "High fiber diet, 3 liters hydration daily, seasonal fruits and sprouted pulses.",
        specialInstructions: "Report immediately in case of severe headache, visual blurring, or decreased fetal movements.",
        isReleasedToPatient: true,
      };
      if (!prescSneha) {
        await Prescription.create(prescData);
      } else {
        Object.assign(prescSneha, prescData);
        await prescSneha.save();
      }
    }

    // Pooja Rathi - Draft Consultation (Pending notes)
    const apptPooja = apptMap["TG-A-1013"];
    if (apptPooja) {
      let consultPooja = await Consultation.findOne({ appointmentId: apptPooja._id });
      const draftData = {
        appointmentId: apptPooja._id,
        patientId: apptPooja.patientId,
        doctorId: doctor._id,
        chiefComplaints: "Irregular menstrual intervals (45-50 days) with persistent acne and mild hirsutism.",
        examinationNotes: "BMI 26.4. Mild facial papules on jawline. Abdomen soft, non-tender. Pelvic ultrasound confirms bilateral multifollicular ovaries.",
        diagnosis: "Polycystic Ovarian Syndrome (Phenotype B) with insulin resistance",
        treatmentPlan: "Pulsatilla Nigricans 200C weekly + lifestyle low-glycemic nutrition plan.",
        followUpAdvice: "Review after 4 weeks with fasting insulin & HbA1c.",
        isFinalized: false,
      };
      if (!consultPooja) {
        consultPooja = await Consultation.create(draftData);
      } else {
        Object.assign(consultPooja, draftData);
        await consultPooja.save();
      }

      // Prescription draft
      let prescPooja = await Prescription.findOne({ consultationId: consultPooja._id });
      if (!prescPooja) {
        await Prescription.create({
          consultationId: consultPooja._id,
          patientId: apptPooja.patientId,
          doctorId: doctor._id,
          medications: [
            { name: "Pulsatilla Nigricans 200C", dosage: "4 globules", frequency: "Once every Sunday morning", duration: "4 weeks", instructions: "Empty stomach on waking." },
            { name: "Myo-Inositol + D-Chiro Inositol", dosage: "2000mg", frequency: "Twice daily", duration: "60 days", instructions: "Mix in half cup water before meals." },
          ],
          dietaryAdvice: "Cut refined sugars and seed oils. Prioritize 30-min brisk morning walk.",
          isReleasedToPatient: true,
        });
      }
    }

    // Riya Patel - Another Draft Consultation
    const apptRiya = apptMap["TG-A-1017"];
    if (apptRiya) {
      let consultRiya = await Consultation.findOne({ appointmentId: apptRiya._id });
      if (!consultRiya) {
        await Consultation.create({
          appointmentId: apptRiya._id,
          patientId: apptRiya.patientId,
          doctorId: doctor._id,
          chiefComplaints: "Chronic dysmenorrhea and pelvic soreness on days 1-2 of cycle.",
          examinationNotes: "Tenderness in posterior fornix on bimanual palpation. Ultrasound shows 2.4cm endometrioma left ovary.",
          diagnosis: "Pelvic Endometriosis Stage I with dysmenorrhea",
          treatmentPlan: "Magnesia Phosphorica 6X + Thuja Occidentalis 200C regimen.",
          followUpAdvice: "Review post next menses.",
          isFinalized: false,
        });
      }
    }

    // 6. Upcoming Follow-ups (Matching reference design)
    const followUpDefs = [
      { patientKey: "TG0016", serviceName: "Antenatal follow-up", dueDate: "2026-10-28", mode: "In-Clinic Consultation", status: "scheduled", scheduledTime: "11:00 AM", planInstructions: "Review 28-week growth scan and repeat blood counts." },
      { patientKey: "TG0020", serviceName: "Test reports review", dueDate: "2026-10-30", mode: "Phone Follow-up", status: "pending", scheduledTime: "04:30 PM", planInstructions: "Telephonic review of thyroid profile and fasting lipid panel." },
      { patientKey: "TG0021", serviceName: "Post treatment review", dueDate: "2026-11-02", mode: "In-Clinic Consultation", status: "pending", scheduledTime: "10:30 AM", planInstructions: "Clinical examination and scar assessment post conservative therapy." },
      { patientKey: "TG0022", serviceName: "Follicular monitoring", dueDate: "2026-11-04", mode: "In-Clinic Consultation", status: "scheduled", scheduledTime: "09:30 AM", planInstructions: "Day 12 transvaginal follicular tracking scan." },
    ];

    for (const f of followUpDefs) {
      const patient = patientMap[f.patientKey];
      if (!patient) continue;
      let flw = await FollowUp.findOne({ patientId: patient._id, serviceName: f.serviceName });
      const count = await FollowUp.countDocuments();
      const code = `FLW-2026-${String(count + 1).padStart(3, "0")}`;

      const fPayload = {
        followUpCode: flw ? flw.followUpCode : code,
        patientId: patient._id,
        doctorId: doctor._id,
        serviceName: f.serviceName,
        dueDate: new Date(f.dueDate),
        scheduledTime: f.scheduledTime,
        mode: f.mode,
        status: f.status,
        planInstructions: f.planInstructions,
        assignedStaff: "Dr. Ananya Sharma Clinical Care Team",
      };

      if (!flw) {
        await FollowUp.create(fPayload);
      } else {
        Object.assign(flw, fPayload);
        await flw.save();
      }
    }
    console.log("Ensured upcoming follow-ups");

    // 7. Clinical Tasks (Matching reference design)
    const taskDefs = [
      { title: "Complete consultation note – Riya Patel", module: "clinical", priority: "high", dueDate: new Date(), status: "open" },
      { title: "Review lab reports – Kavya Mehta", module: "clinical", priority: "high", dueDate: new Date(), status: "open" },
      { title: "Update prescription – Sonal Gupta", module: "clinical", priority: "medium", dueDate: new Date(), status: "open" },
      { title: "Add follow-up notes – Neha Singh", module: "clinical", priority: "low", dueDate: new Date("2026-10-28"), status: "open" },
    ];

    for (const t of taskDefs) {
      const existing = await Task.findOne({ title: t.title, assignedTo: user._id });
      if (!existing) {
        await Task.create({
          ...t,
          assignedTo: user._id,
          createdBy: user._id,
        });
      }
    }
    console.log("Ensured clinical tasks");

    // 8. Recent Activity Audit Logs
    const nowTime = new Date();
    const activityDefs = [
      { action: "CONSULTATION_FINALIZED", targetEntity: "Consultation", details: { message: "Consultation completed – Sneha Kapoor", patient: "Sneha Kapoor" }, timeOffsetMinutes: 15 },
      { action: "PATIENT_CHECKED_IN", targetEntity: "Appointment", details: { message: "Patient checked in – Sonal Gupta", patient: "Sonal Gupta" }, timeOffsetMinutes: 28 },
      { action: "PRESCRIPTION_CREATED", targetEntity: "Prescription", details: { message: "Prescription created – Pooja Rathi", patient: "Pooja Rathi" }, timeOffsetMinutes: 45 },
      { action: "FOLLOWUP_RECOMMENDED", targetEntity: "FollowUp", details: { message: "Follow-up scheduled – Meera Tandon", patient: "Meera Tandon" }, timeOffsetMinutes: 60 },
    ];

    for (const act of activityDefs) {
      const actTime = new Date(nowTime.getTime() - act.timeOffsetMinutes * 60000);
      await AuditLog.create({
        actorId: user._id,
        actorRole: "doctor",
        action: act.action,
        targetEntity: act.targetEntity,
        details: act.details,
        timestamp: actTime,
      });
    }
    console.log("Ensured recent activity logs");

    // 9. Unread Notifications (3 notifications matching reference badge)
    const notifDefs = [
      { title: "Patient Checked In", message: "Sonal Gupta has checked in for Antenatal Checkup (TG-A-1018)", type: "clinical" },
      { title: "Lab Reports Ready", message: "Pathology results for Kavya Mehta (Hormonal Profile & TSH) are ready for review", type: "clinical" },
      { title: "Upcoming Follow-up", message: "Neha Singh follow-up due in 3 days on 28 October 2026", type: "clinical" },
    ];

    // Mark previous as read so exactly 3 unread exist
    await Notification.updateMany({ recipientId: user._id }, { read: true });
    for (const n of notifDefs) {
      await Notification.create({
        recipientId: user._id,
        recipientRole: "doctor",
        title: n.title,
        message: n.message,
        type: n.type,
        read: false,
      });
    }
    console.log("Ensured 3 unread notifications for Dr. Ananya Sharma");

    console.log("\n=======================================================");
    console.log("DOCTOR ANANYA SHARMA SEEDING COMPLETED SUCCESSFULLY!");
    console.log("Credentials: ananya.sharma@trigyna.test / TriGyna@123");
    console.log("=======================================================");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedDoctorAnanya();
}

module.exports = seedDoctorAnanya;

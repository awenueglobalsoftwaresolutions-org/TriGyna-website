const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const FollowUp = require("../modules/clinical/followup.model");
const Notification = require("../modules/notifications/notification.model");
const AuditLog = require("../modules/audit/audit.model");

async function seedReferenceDashboard() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);

  try {
    const passwordHash = await User.hashPassword("TriGyna@123");

    // 1. Doctor user
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
    }

    // 2. Doctor profile
    let doctor = await Doctor.findOne({ userId: user._id });
    const docData = {
      userId: user._id,
      specialization: ["Obstetrician & Gynecologist", "Antenatal & Maternal Care", "Fertility & Reproductive Health"],
      qualifications: "MS, DGO (Obstetrics & Gynecology)",
      consultationFee: 800,
      bio: "Specialist in comprehensive maternal care, reproductive endocrinology, and holistic women's wellness.",
      status: "active",
      isVerified: true,
      verificationStatus: "verified",
      consultationModes: ["Online Video Consultation"],
      supportedVideoProviders: ["google_meet", "zoom"],
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
      doctor = await Doctor.create(docData);
    } else {
      Object.assign(doctor, docData);
      await doctor.save();
    }

    // 3. Exact Patients from Reference Screenshot
    const patientsDef = [
      { patientCode: "TG-10234", fullName: "Priya Rao", age: 28, gender: "female", phone: "9820010234", bloodGroup: "B+", allergies: [], medicalHistory: "PCOD Remission Protocol - Follow-up on cycle regularity and insulin sensitivity." },
      { patientCode: "TG-10235", fullName: "Sanya Khanna", age: 32, gender: "female", phone: "9820010235", bloodGroup: "O+", allergies: ["Dust"], medicalHistory: "Hormonal acne and diffuse scalp shedding. Classical homoeopathic evaluation." },
      { patientCode: "TG-10236", fullName: "Aditi Mehra", age: 29, gender: "female", phone: "9820010236", bloodGroup: "A+", allergies: [], medicalHistory: "Anti-inflammatory functional nutrition plan for PCOS and gut metabolic optimization." },
      { patientCode: "TG-10237", fullName: "Ritika Singh", age: 34, gender: "female", phone: "9820010237", bloodGroup: "AB+", allergies: ["Penicillin"], medicalHistory: "Thyroid wellness checkup, fatigue management, and lipid profile review." },
      { patientCode: "TG-10238", fullName: "Neha Patel", age: 27, gender: "female", phone: "9820010238", bloodGroup: "O-", allergies: [], medicalHistory: "Irregular cycles, follicular monitoring, and preconception optimization." },
      { patientCode: "TG-10239", fullName: "Meenal Jain", age: 30, gender: "female", phone: "9820010239", bloodGroup: "B-", allergies: [], medicalHistory: "Consultation completed. Constitutional homoeopathic remedy prescribed." },
      { patientCode: "TG-10240", fullName: "Kavita Sharma", age: 31, gender: "female", phone: "9820010240", bloodGroup: "A-", allergies: [], medicalHistory: "Second trimester antenatal check, fetal growth normal." },
      { patientCode: "TG-10241", fullName: "Pooja Deshmukh", age: 35, gender: "female", phone: "9820010241", bloodGroup: "AB-", allergies: [], medicalHistory: "Hypothyroidism & weight management protocol." },
    ];

    const pMap = {};
    for (const p of patientsDef) {
      let patient = await Patient.findOne({ patientCode: p.patientCode });
      if (!patient) {
        patient = await Patient.create({ ...p, status: "active", assignedDoctorId: doctor._id });
      } else {
        Object.assign(patient, p);
        patient.assignedDoctorId = doctor._id;
        await patient.save();
      }
      pMap[p.patientCode] = patient;
    }

    // 4. Reference Dates
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const referenceDates = Array.from(new Set(["2026-10-26", todayStr]));

    // 5. Day's schedule items (8 appointments)
    const scheduleItems = [
      { code: "TG-A-10234", pKey: "TG-10234", time: "09:00", endTime: "09:45", service: "PCOD/PCOS Management", status: "confirmed", meetingLink: "https://meet.google.com/tg-priya-rao" },
      { code: "TG-A-10235", pKey: "TG-10235", time: "09:45", endTime: "10:30", service: "Skin & Hair Consultation", status: "in_queue", meetingLink: "https://meet.google.com/tg-sanya-khanna" },
      { code: "TG-A-10236", pKey: "TG-10236", time: "10:30", endTime: "11:15", service: "Diet & Nutrition", status: "confirmed", meetingLink: "https://meet.google.com/tg-aditi-mehra" },
      { code: "TG-A-10237", pKey: "TG-10237", time: "11:15", endTime: "12:00", service: "General Medicine", status: "confirmed", meetingLink: "https://meet.google.com/tg-ritika-singh" },
      { code: "TG-A-10238", pKey: "TG-10238", time: "12:00", endTime: "12:45", service: "Hormonal Health", status: "confirmed", meetingLink: "https://meet.google.com/tg-neha-patel" },
      { code: "TG-A-10239", pKey: "TG-10239", time: "14:00", endTime: "14:45", service: "PCOD/PCOS Management", status: "completed", meetingLink: "https://meet.google.com/tg-meenal-jain" },
      { code: "TG-A-10240", pKey: "TG-10240", time: "15:00", endTime: "15:45", service: "Antenatal Care", status: "completed", meetingLink: "https://meet.google.com/tg-kavita-sharma" },
      { code: "TG-A-10241", pKey: "TG-10241", time: "16:00", endTime: "16:45", service: "Thyroid & Metabolic", status: "completed", meetingLink: "https://meet.google.com/tg-pooja-deshmukh" },
    ];

    for (const rDate of referenceDates) {
      for (const item of scheduleItems) {
        const patient = pMap[item.pKey];
        if (!patient) continue;
        const code = rDate === "2026-10-26" ? item.code : `${item.code}-${rDate}`;
        let appt = await Appointment.findOne({ appointmentCode: code });
        const apptData = {
          appointmentCode: code,
          patientId: patient._id,
          doctorId: doctor._id,
          serviceName: item.service,
          appointmentDate: rDate,
          startTime: item.time,
          endTime: item.endTime,
          mode: "Online Video Consultation",
          status: item.status,
          meetingProvider: "google_meet",
          meetingLink: item.meetingLink,
          meetingStatus: "ready",
          checkedInAt: item.status === "in_queue" || item.status === "confirmed" ? new Date() : undefined,
          completedAt: item.status === "completed" ? new Date() : undefined,
          paymentStatus: "paid",
        };
        if (!appt) {
          await Appointment.create(apptData);
        } else {
          Object.assign(appt, apptData);
          await appt.save();
        }
      }
    }

    // 6. Ensure 18 upcoming future appointments (4 in next 7 days, 14 beyond)
    for (let i = 1; i <= 18; i++) {
      const dayOffset = i <= 4 ? i : i + 5;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + dayOffset);
      const futureDateStr = futureDate.toISOString().split("T")[0];
      const pKey = `TG-1023${(i % 8) + 4}`;
      const patient = pMap[pKey] || pMap["TG-10234"];
      const code = `TG-UPCOMING-${String(i).padStart(3, "0")}`;

      let appt = await Appointment.findOne({ appointmentCode: code });
      const upData = {
        appointmentCode: code,
        patientId: patient._id,
        doctorId: doctor._id,
        serviceName: "Online Video Consultation",
        appointmentDate: futureDateStr,
        startTime: "10:00",
        endTime: "10:30",
        mode: "Online Video Consultation",
        status: "confirmed",
        meetingProvider: "google_meet",
        meetingLink: "https://meet.google.com/tg-consult",
        meetingStatus: "ready",
        paymentStatus: "paid",
      };
      if (!appt) {
        await Appointment.create(upData);
      } else {
        Object.assign(appt, upData);
        await appt.save();
      }
    }

    // 7. Ensure 3 Draft Prescriptions linked to Draft Consultations
    const prescDraftDefs = [
      { patientKey: "TG-10234", chief: "PCOD Remission Protocol checkup", meds: [{ name: "Myo-Inositol + D-Chiro", dosage: "2000mg", frequency: "Twice daily", duration: "60 days" }] },
      { patientKey: "TG-10235", chief: "Hormonal acne evaluation", meds: [{ name: "Silicea 30C", dosage: "4 globules", frequency: "Weekly", duration: "30 days" }] },
      { patientKey: "TG-10237", chief: "Thyroid wellness checkup", meds: [{ name: "Thyroidinum 6X", dosage: "2 tablets", frequency: "Morning", duration: "30 days" }] },
    ];
    for (let i = 0; i < prescDraftDefs.length; i++) {
      const def = prescDraftDefs[i];
      const patient = pMap[def.patientKey];
      if (!patient) continue;

      let consult = await Consultation.findOne({ patientId: patient._id, isFinalized: false });
      if (!consult) {
        consult = await Consultation.create({
          consultationCode: `TG-C-DRAFT-${i + 1}`,
          patientId: patient._id,
          doctorId: doctor._id,
          chiefComplaints: def.chief,
          diagnosis: "Clinical evaluation in progress",
          isFinalized: false,
          status: "draft",
        });
      }

      const code = `TG-RX-DRAFT-${i + 1}`;
      let presc = await Prescription.findOne({ prescriptionCode: code });
      const pData = {
        prescriptionCode: code,
        consultationId: consult._id,
        patientId: patient._id,
        doctorId: doctor._id,
        medications: def.meds,
        dietaryAdvice: "Anti-inflammatory Mediterranean plate with low glycemic indices.",
        isReleasedToPatient: false,
        isFinalized: false,
        status: "draft",
      };
      if (!presc) {
        await Prescription.create(pData);
      } else {
        Object.assign(presc, pData);
        await presc.save();
      }
    }

    // 8. Ensure 5 Follow-ups (2 overdue, 3 due today, 5 upcoming)
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 3);

    const todayDate = new Date();

    const fuDefs = [
      { pKey: "TG-10235", reason: "Follow-up on hormonal skin flares", date: overdueDate, status: "pending" },
      { pKey: "TG-10238", reason: "Review luteal phase temperature records", date: overdueDate, status: "pending" },
      { pKey: "TG-10234", reason: "Insulin sensitivity post nutritional shift", date: todayDate, status: "scheduled" },
      { pKey: "TG-10236", reason: "Dietary compliance review", date: todayDate, status: "scheduled" },
      { pKey: "TG-10237", reason: "Thyroid blood panel verification", date: todayDate, status: "scheduled" },
    ];

    for (let i = 0; i < fuDefs.length; i++) {
      const fu = fuDefs[i];
      const patient = pMap[fu.pKey];
      if (!patient) continue;
      const code = `TG-FU-REF-${i + 1}`;
      let existing = await FollowUp.findOne({ followUpCode: code });
      const fData = {
        followUpCode: code,
        patientId: patient._id,
        doctorId: doctor._id,
        serviceName: "Online Video Follow-up",
        dueDate: fu.date,
        scheduledTime: "11:00 AM",
        mode: "Online Video Consultation",
        status: fu.status,
        planInstructions: fu.reason,
      };
      if (!existing) {
        await FollowUp.create(fData);
      } else {
        Object.assign(existing, fData);
        await existing.save();
      }
    }

    // 9. Recent Activity Audit Logs matching screenshot exactly
    await AuditLog.deleteMany({ actorId: user._id });
    const nowTime = Date.now();
    const exactActivities = [
      { action: "PRESCRIPTION_SAVED", patient: "Priya Rao", message: "Prescription created for Priya Rao", minutesAgo: 5, targetEntity: "Prescription" },
      { action: "CONSULTATION_FINALIZED", patient: "Meenal Jain", message: "Consultation completed for Meenal Jain", minutesAgo: 22, targetEntity: "Consultation" },
      { action: "FOLLOWUP_CREATED", patient: "Aditi Mehra", message: "Follow-up scheduled for Aditi Mehra", minutesAgo: 36, targetEntity: "FollowUp" },
    ];
    for (const act of exactActivities) {
      await AuditLog.create({
        actorId: user._id,
        actorRole: "doctor",
        action: act.action,
        targetEntity: act.targetEntity,
        details: { message: act.message, patient: act.patient, patientName: act.patient },
        timestamp: new Date(nowTime - act.minutesAgo * 60000),
      });
    }

    // 10. Exactly 3 Unread Notifications
    await Notification.updateMany({ recipientId: user._id }, { read: true });
    const refNotifs = [
      { title: "Consultation Scheduled", message: "Priya Rao (TG-10234) has booked PCOD/PCOS Management for today at 09:00 AM.", type: "appointment" },
      { title: "Video Link Ready", message: "Google Meet link verified for online consultation with Sanya Khanna.", type: "clinical" },
      { title: "Follow-up Due", message: "2 patient follow-up checks are currently overdue in your clinical queue.", type: "clinical" },
    ];
    for (const n of refNotifs) {
      await Notification.create({
        recipientId: user._id,
        recipientRole: "doctor",
        title: n.title,
        message: n.message,
        type: n.type,
        read: false,
      });
    }

    console.log("=================================================================");
    console.log("REFERENCE DOCTOR DASHBOARD PERSISTED TO MONGODB SUCCESSFULLY!");
    console.log("=================================================================");
  } catch (err) {
    console.error("Failed seeding reference dashboard:", err);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedReferenceDashboard();
}

module.exports = seedReferenceDashboard;

const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Consultation = require("../modules/clinical/consultation.model");
const TreatmentPlan = require("../modules/clinical/treatmentplan.model");
const Prescription = require("../modules/clinical/prescription.model");
const Appointment = require("../modules/appointments/appointment.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const { Counter } = require("../shared/counter.service");

function computeRecordHash(consultation) {
  const payload = {
    id: consultation._id.toString(),
    code: consultation.consultationCode,
    patientId: consultation.patientId?.toString(),
    doctorId: consultation.doctorId?.toString(),
    diagnosis: consultation.diagnosis,
    chiefComplaints: consultation.chiefComplaints,
    examinationNotes: consultation.examinationNotes,
    treatmentPlan: consultation.treatmentPlan,
    finalizedAt: consultation.finalizedAt,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  console.log("[Migration] Connecting to MongoDB:", uri);
  await mongoose.connect(uri);

  const consults = await Consultation.find().sort({ createdAt: 1 });
  console.log(`[Migration] Found ${consults.length} existing consultations.`);

  let seq = 1000;
  for (const c of consults) {
    let updated = false;

    // 1. Assign consultationCode if missing
    if (!c.consultationCode) {
      seq++;
      c.consultationCode = `TG-C-${seq}`;
      updated = true;
    }

    // 2. Set consultationDate
    if (!c.consultationDate) {
      if (c.appointmentId) {
        const appt = await Appointment.findById(c.appointmentId);
        if (appt && appt.appointmentDate) {
          c.consultationDate = new Date(appt.appointmentDate);
        } else {
          c.consultationDate = c.createdAt || new Date();
        }
      } else {
        c.consultationDate = c.createdAt || new Date();
      }
      updated = true;
    }

    // 3. Status
    if (!c.status) {
      c.status = c.isFinalized ? "finalized" : "in_progress";
      updated = true;
    }

    // 4. Mode
    if (!c.mode) {
      c.mode = "Video Consultation";
      updated = true;
    }

    // 5. Diagnosis tags
    if ((!c.diagnosisTags || c.diagnosisTags.length === 0) && c.diagnosis) {
      const tags = [];
      if (/telogen effluvium/i.test(c.diagnosis)) tags.push("Telogen Effluvium");
      if (/nutritional deficiency/i.test(c.diagnosis)) tags.push("Nutritional Deficiency");
      if (/pcod|pcos/i.test(c.diagnosis)) tags.push("PCOS", "Insulin Resistance");
      if (/pregnancy/i.test(c.diagnosis)) tags.push("Intrauterine Pregnancy", "24 weeks");
      if (/allergic rhinitis/i.test(c.diagnosis)) tags.push("Allergic Rhinitis");
      if (/acne/i.test(c.diagnosis)) tags.push("Acne Vulgaris");
      if (tags.length === 0) tags.push(c.diagnosis.split(",")[0].trim());
      c.diagnosisTags = tags;
      updated = true;
    }

    // 6. Record Hash
    if (c.isFinalized && !c.recordHash) {
      c.recordHash = computeRecordHash(c);
      updated = true;
    }

    // 7. Check if linked prescription exists
    const rx = await Prescription.findOne({ consultationId: c._id });
    if (rx && (!c.prescriptionRef || c.prescriptionRef.toString() !== rx._id.toString())) {
      c.prescriptionRef = rx._id;
      updated = true;
    }

    // 8. Treatment Plan
    let plan = await TreatmentPlan.findOne({ consultationId: c._id });
    if (!plan && c.treatmentPlan) {
      const planSeq = seq;
      plan = await TreatmentPlan.create({
        planCode: `TG-TP-${planSeq}`,
        patientId: c.patientId,
        doctorId: c.doctorId,
        consultationId: c._id,
        diagnosis: c.diagnosis,
        title: c.diagnosis ? `Care Protocol for ${c.diagnosis.slice(0, 40)}` : "Holistic Health Protocol",
        treatmentDescription: c.treatmentPlan,
        interventions: [
          {
            title: c.treatmentPlan.slice(0, 60),
            duration: "30 days",
            frequency: "Daily",
            status: c.isFinalized ? "ongoing" : "pending",
          },
          {
            title: "Constitutional posology & clinical monitoring",
            duration: "30 days",
            status: "ongoing",
          },
        ],
        startDate: c.consultationDate || c.createdAt,
        status: "active",
      });
      c.treatmentPlanRef = plan._id;
      updated = true;
    } else if (plan && (!c.treatmentPlanRef || c.treatmentPlanRef.toString() !== plan._id.toString())) {
      c.treatmentPlanRef = plan._id;
      updated = true;
    }

    if (updated) {
      await c.save();
    }
  }

  // Update Counter sequence
  await Counter.findOneAndUpdate(
    { _id: "consultation_code" },
    { $max: { seq } },
    { upsert: true, new: true }
  );

  await Counter.findOneAndUpdate(
    { _id: "treatment_plan_code" },
    { $max: { seq } },
    { upsert: true, new: true }
  );

  console.log(`[Migration] Completed backfill! Max consultation_code seq is now ${seq}`);
  const totalPlans = await TreatmentPlan.countDocuments();
  console.log(`[Migration] Total TreatmentPlans in DB: ${totalPlans}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[Migration] Error:", err);
  process.exit(1);
});


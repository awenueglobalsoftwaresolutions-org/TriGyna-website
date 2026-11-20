const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const FollowUp = require("../modules/clinical/followup.model");
const Prescription = require("../modules/clinical/prescription.model");

const {
  generateAtomicAppointmentCode,
  generateAtomicConsultationCode,
  generateAtomicFollowUpCode,
} = require("../shared/counter.service");

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);

  const doctor = await Doctor.findOne() || { _id: new mongoose.Types.ObjectId() };

  // 1. Sandeep Kumar (TR-1016)
  let sandeep = await Patient.findOne({ patientCode: "TR-1016" });
  if (sandeep) {
    sandeep.email = "sandeep.k@gmail.com";
    sandeep.bloodGroup = "O+";
    sandeep.dateOfBirth = new Date("1982-02-12");
    sandeep.age = 44;
    sandeep.gender = "male";
    sandeep.address = "Flat 304, Palm Heights, Sector 18, Navi Mumbai";
    sandeep.medicalHistory = "General Consultation | Allergy | Hypertension (Controlled)";
    sandeep.allergies = ["Pollen", "Dust"];
    sandeep.status = "active";
    sandeep.isArchived = false;
    sandeep.emergencyContact = {
      name: "Meena Kumar",
      phone: "+91 98765 00016",
      relationship: "Spouse",
    };
    await sandeep.save();
    console.log("Updated Sandeep Kumar (TR-1016)");

    // Ensure 26 Oct 2026 Appointment (completed)
    let appt26 = await Appointment.findOne({ patientId: sandeep._id, appointmentDate: "2026-10-26" });
    if (!appt26) {
      const apptCode = await generateAtomicAppointmentCode();
      appt26 = await Appointment.create({
        appointmentCode: apptCode,
        patientId: sandeep._id,
        doctorId: doctor._id,
        serviceName: "General Consultation",
        appointmentDate: "2026-10-26",
        startTime: "10:30",
        endTime: "11:00",
        mode: "Online Video Consultation",
        status: "completed",
        notes: "Seasonal allergy evaluation & hypertension review.",
        bookingSource: "website",
        paymentStatus: "paid",
      });
      console.log(`Created 26 Oct Appointment for Sandeep (${apptCode})`);
    }

    // Ensure 26 Oct 2026 Consultation
    let consult26 = await Consultation.findOne({ patientId: sandeep._id });
    if (!consult26) {
      const consultCode = await generateAtomicConsultationCode();
      consult26 = await Consultation.create({
        consultationCode: consultCode,
        appointmentId: appt26._id,
        patientId: sandeep._id,
        doctorId: doctor._id,
        chiefComplaints: "Seasonal sneezing, itchy watery eyes, dust hypersensitivity.",
        examinationNotes: "Nasal mucosa congested. BP 124/82 mmHg. Clear chest.",
        diagnosis: "Seasonal Allergic Rhinitis & Essential Hypertension (Controlled)",
        diagnosisTags: ["Allergic Rhinitis", "Hypertension"],
        treatmentPlan: "Non-sedating antihistamines and saline nasal irrigation daily.",
        isFinalized: true,
        finalizedAt: new Date("2026-10-26T11:00:00.000Z"),
        consultationDate: new Date("2026-10-26T10:30:00.000Z"),
        mode: "Video Consultation",
        status: "finalized",
      });
      console.log(`Created 26 Oct Consultation for Sandeep (${consultCode})`);
    }

    // Ensure Follow-up on 25 Nov 2026
    let followup = await FollowUp.findOne({ patientId: sandeep._id });
    if (!followup) {
      const fuCode = await generateAtomicFollowUpCode();
      followup = await FollowUp.create({
        followUpCode: fuCode,
        patientId: sandeep._id,
        doctorId: doctor._id,
        serviceName: "General Consultation",
        dueDate: new Date("2026-11-25T10:00:00.000Z"),
        scheduledTime: "10:00 AM",
        mode: "Video consultation",
        status: "scheduled",
        interval: "Day 30",
        planInstructions: "Follow-up review of allergy symptom control and blood pressure log.",
      });
      console.log(`Created 25 Nov Followup for Sandeep (${fuCode})`);
    }
  }

  // 2. Alka Singh (TR-1015)
  let alka = await Patient.findOne({ patientCode: "TR-1015" });
  if (alka) {
    alka.email = "alka.s@gmail.com";
    alka.bloodGroup = "A+";
    alka.dateOfBirth = new Date("1990-04-18");
    alka.age = 36;
    alka.gender = "female";
    alka.medicalHistory = "PCOS Care | Hormonal";
    alka.allergies = [];
    alka.status = "active";
    alka.isArchived = false;
    alka.emergencyContact = {
      name: "Vikram Singh",
      phone: "+91 98765 00015",
      relationship: "Spouse",
    };
    await alka.save();
    console.log("Updated Alka Singh (TR-1015)");
  }

  // 3. Rahul Mehta (TR-1014)
  let rahul = await Patient.findOne({ patientCode: "TR-1014" });
  if (rahul) {
    rahul.email = "rahul.m@gmail.com";
    rahul.bloodGroup = "B+";
    rahul.dateOfBirth = new Date("1988-08-22");
    rahul.age = 38;
    rahul.gender = "male";
    rahul.medicalHistory = "General Consultation | Metabolic";
    rahul.allergies = [];
    rahul.status = "active";
    rahul.isArchived = false;
    rahul.emergencyContact = {
      name: "Pooja Mehta",
      phone: "+91 98765 00014",
      relationship: "Spouse",
    };
    await rahul.save();
    console.log("Updated Rahul Mehta (TR-1014)");
  }

  // 4. Manisha Singh (TR-1013)
  let manisha = await Patient.findOne({ patientCode: "TR-1013" });
  if (manisha) {
    manisha.email = "manisha.s@gmail.com";
    manisha.bloodGroup = "O-";
    manisha.dateOfBirth = new Date("1997-01-15");
    manisha.age = 29;
    manisha.gender = "female";
    manisha.medicalHistory = "Fertility Care | Preconception";
    manisha.allergies = [];
    manisha.status = "active";
    manisha.isArchived = false;
    manisha.emergencyContact = {
      name: "Aditya Singh",
      phone: "+91 98765 00013",
      relationship: "Spouse",
    };
    await manisha.save();
    console.log("Updated Manisha Singh (TR-1013)");
  }

  // 5. Sunita Patel (TR-1012)
  let sunita = await Patient.findOne({ patientCode: "TR-1012" });
  if (sunita) {
    sunita.email = "sunita.p@gmail.com";
    sunita.bloodGroup = "AB+";
    sunita.dateOfBirth = new Date("1985-06-10");
    sunita.age = 41;
    sunita.gender = "female";
    sunita.medicalHistory = "Menopause Care | Hormonal";
    sunita.allergies = [];
    sunita.status = "active";
    sunita.isArchived = false;
    sunita.emergencyContact = {
      name: "Ramesh Patel",
      phone: "+91 98765 00012",
      relationship: "Spouse",
    };
    await sunita.save();
    console.log("Updated Sunita Patel (TR-1012)");
  }

  console.log("Reference patient backfill complete!");
  await mongoose.disconnect();
}

run().catch(console.error);

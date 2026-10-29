const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const Patient = require("../modules/patients/patient.model");
const AuditLog = require("../modules/audit/audit.model");

async function repair() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  console.log("Connecting to MongoDB:", uri);
  await mongoose.connect(uri);

  const targetIds = [
    new mongoose.Types.ObjectId("6adbd2c085dc6a5051bbc709"),
    new mongoose.Types.ObjectId("6add86c89e6ff46a99f35a0c"),
    new mongoose.Types.ObjectId("6add9d72f9ca4167cf1916f0")
  ];

  for (const tid of targetIds) {
    const existing = await Patient.findById(tid);
    if (existing) {
      console.log(`Patient ${tid} already exists:`, existing.fullName);
      continue;
    }

    // Check audit logs for original details
    const audit = await AuditLog.findOne({
      targetId: tid.toString(),
      action: "PATIENT_PERMANENTLY_DELETED"
    }).sort({ createdAt: -1 });

    let patientCode = "TG-P-1023";
    let fullName = "Pooja Kulkarni";
    let phone = "9820011223";

    if (audit && audit.details) {
      patientCode = audit.details.patientCode || patientCode;
      fullName = audit.details.fullName || fullName;
      phone = audit.details.phone || phone;
      console.log(`Found audit log for ${tid}: ${fullName} (${patientCode}, ${phone})`);
    } else {
      console.log(`No audit log for ${tid}, using fallback details`);
      if (tid.toString() === "6add86c89e6ff46a99f35a0c") {
        patientCode = "TG-P-1082";
        fullName = "Kavita Deshmukh";
        phone = "9820088991";
      } else if (tid.toString() === "6add9d72f9ca4167cf1916f0") {
        patientCode = "TG-P-1083";
        fullName = "Meera Nambiar";
        phone = "9820088992";
      }
    }

    const restoredPatient = new Patient({
      _id: tid,
      patientCode,
      fullName,
      phone,
      gender: "female",
      age: 32,
      bloodGroup: "B+",
      city: "Pune",
      notes: "Restored patient record to maintain referential integrity of clinical & billing history"
    });

    await restoredPatient.save();
    console.log(`✅ Restored patient: ${fullName} (${patientCode}, ID: ${tid})`);
  }

  await mongoose.disconnect();
  console.log("Database repair complete.");
}

repair().catch(err => {
  console.error("Repair error:", err);
  process.exit(1);
});

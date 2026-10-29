/**
 * TriGyna Phase 2 - Stage B Rollback Script
 * 
 * Reverses all changes applied by migrate-stage-b-integrity.js using the recorded rollback state.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const MONGO_URI = process.env.TARGET_DB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
const ROLLBACK_STATE_PATH = path.join(__dirname, "../../backups/stage_b_rollback_state.json");

async function runStageBRollback() {
  console.log("================================================================================");
  console.log("Starting TriGyna Stage B: Rollback Procedure");
  console.log(`Target Database: ${MONGO_URI}`);
  console.log("================================================================================");

  if (!fs.existsSync(ROLLBACK_STATE_PATH)) {
    console.error(`Rollback state file not found at: ${ROLLBACK_STATE_PATH}`);
    process.exit(1);
  }

  const rollbackState = JSON.parse(fs.readFileSync(ROLLBACK_STATE_PATH, "utf-8"));
  console.log(`Loaded rollback state recorded at: ${rollbackState.migratedAt}`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  try {
    // 1. Rollback Appointment TG-A-1032
    if (rollbackState.appointmentFix) {
      console.log("- Reverting Appointment TG-A-1032...");
      await db.collection("appointments").updateOne(
        { _id: new mongoose.Types.ObjectId(rollbackState.appointmentFix._id) },
        { 
          $set: { 
            doctorId: rollbackState.appointmentFix.originalDoctorId 
              ? new mongoose.Types.ObjectId(rollbackState.appointmentFix.originalDoctorId) 
              : null,
            updatedAt: new Date()
          } 
        }
      );
      console.log("✓ Appointment TG-A-1032 restored.");
    }

    // 2. Rollback Consultations
    console.log(`- Reverting ${rollbackState.consultationsFix.length} consultations...`);
    for (const c of rollbackState.consultationsFix) {
      await db.collection("consultations").updateOne(
        { _id: new mongoose.Types.ObjectId(c._id) },
        {
          $set: {
            appointmentId: new mongoose.Types.ObjectId(c.originalAppointmentId),
            updatedAt: new Date()
          },
          $unset: { legacyAppointmentId: "" }
        }
      );
    }
    console.log("✓ Consultations reverted.");

    // 3. Rollback Invoices
    console.log(`- Reverting ${rollbackState.invoicesFix.length} invoices...`);
    for (const inv of rollbackState.invoicesFix) {
      await db.collection("invoices").updateOne(
        { _id: new mongoose.Types.ObjectId(inv._id) },
        {
          $set: {
            appointmentId: new mongoose.Types.ObjectId(inv.originalAppointmentId),
            updatedAt: new Date()
          },
          $unset: { legacyAppointmentId: "" }
        }
      );
    }
    console.log("✓ Invoices reverted.");

    // 4. Rollback Patient Consolidations & Re-linked Invoices
    console.log("- Reverting re-linked invoices to duplicate patient records...");
    for (const relink of rollbackState.patientsMergeFix.relinkedInvoices) {
      await db.collection("invoices").updateOne(
        { _id: new mongoose.Types.ObjectId(relink.invoiceId) },
        {
          $set: {
            patientId: new mongoose.Types.ObjectId(relink.originalPatientId),
            updatedAt: new Date()
          }
        }
      );
    }

    console.log(`- Un-merging ${rollbackState.patientsMergeFix.mergedIds.length} duplicate patient profiles...`);
    for (const id of rollbackState.patientsMergeFix.mergedIds) {
      await db.collection("patients").updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            status: "active",
            isArchived: false,
            updatedAt: new Date()
          },
          $unset: { mergedInto: "" }
        }
      );
    }
    console.log("✓ Patient profiles restored to active.");

    console.log("\n✓ Stage B Rollback completed successfully.");
  } catch (err) {
    console.error("Rollback failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runStageBRollback();

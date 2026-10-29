/**
 * TriGyna Phase 2 - Stage B Database Integrity Migration Script
 * 
 * Reversible, auditable reconciliation of Phase 1 audit anomalies:
 * 1. Re-links Appointment TG-A-1032 to Doctor 6adbb55084908d9eefc5c56e (Homoeopath).
 * 2. Converts consultations.appointmentId unique index to a partial unique index.
 * 3. Preserves 13 dangling clinical consultations by unsetting appointmentId and saving legacyAppointmentId.
 * 4. Preserves 13 dangling financial invoices by unsetting appointmentId and saving legacyAppointmentId.
 * 5. Consolidates 12 duplicate seed patient profiles (+91 97654 00000) into canonical TR-NOEMAIL-0820,
 *    re-linking their invoices and marking duplicates as merged/archived. ZERO documents deleted.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const MONGO_URI = process.env.TARGET_DB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
const ROLLBACK_STATE_PATH = path.join(__dirname, "../../backups/stage_b_rollback_state.json");

async function runStageBMigration() {
  console.log("================================================================================");
  console.log("Starting TriGyna Stage B: Database Integrity & Reconciliation Migration");
  console.log(`Target Database: ${MONGO_URI}`);
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log("================================================================================");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const rollbackState = {
    migratedAt: new Date().toISOString(),
    database: MONGO_URI,
    appointmentFix: null,
    consultationsFix: [],
    invoicesFix: [],
    patientsMergeFix: {
      canonicalId: "6adc03b03da6e1feca1dbbf4",
      mergedIds: [],
      relinkedInvoices: []
    }
  };

  try {
    // --------------------------------------------------------------------------
    // Pre-condition Checks
    // --------------------------------------------------------------------------
    console.log("\n[1/6] Running Pre-condition Verification...");
    const initialPatientCount = await db.collection("patients").countDocuments();
    const initialInvoiceCount = await db.collection("invoices").countDocuments();
    const initialConsultationCount = await db.collection("consultations").countDocuments();
    const initialAppointmentCount = await db.collection("appointments").countDocuments();

    console.log(`- Initial Patients: ${initialPatientCount}`);
    console.log(`- Initial Invoices: ${initialInvoiceCount}`);
    console.log(`- Initial Consultations: ${initialConsultationCount}`);
    console.log(`- Initial Appointments: ${initialAppointmentCount}`);

    // --------------------------------------------------------------------------
    // Phase 1: Re-link Appointment TG-A-1032
    // --------------------------------------------------------------------------
    console.log("\n[2/6] Re-linking Appointment TG-A-1032 to valid Doctor...");
    const apptDoc = await db.collection("appointments").findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId("6adbd40f85dc6a5051bbcfba") },
        { _id: "6adbd40f85dc6a5051bbcfba" },
        { appointmentCode: "TG-A-1032" }
      ]
    });

    const targetDoctor = await db.collection("doctors").findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId("6adbb55084908d9eefc5c56e") },
        { _id: "6adbb55084908d9eefc5c56e" },
        { specialization: /Homoeopath/i }
      ]
    });

    if (apptDoc && targetDoctor) {
      rollbackState.appointmentFix = {
        _id: apptDoc._id.toString(),
        originalDoctorId: apptDoc.doctorId ? apptDoc.doctorId.toString() : null
      };

      await db.collection("appointments").updateOne(
        { _id: apptDoc._id },
        { 
          $set: { 
            doctorId: targetDoctor._id,
            updatedAt: new Date()
          } 
        }
      );

      await db.collection("auditlogs").insertOne({
        action: "APPOINTMENT_DOCTOR_REASSIGNED_RECONCILIATION",
        module: "appointments",
        targetId: apptDoc._id,
        metadata: {
          previousDoctorId: apptDoc.doctorId,
          newDoctorId: targetDoctor._id,
          reason: "Stage B data integrity reconciliation: assigned to Senior Consulting Homoeopath"
        },
        createdAt: new Date()
      });
      console.log(`✓ Appointment TG-A-1032 re-linked to Doctor ${targetDoctor._id}`);
    } else {
      console.log(`! Appointment TG-A-1032 or target Doctor not found. (apptDoc: ${Boolean(apptDoc)}, targetDoctor: ${Boolean(targetDoctor)})`);
    }

    // --------------------------------------------------------------------------
    // Phase 2: Update Consultations appointmentId Index to Partial Unique
    // --------------------------------------------------------------------------
    console.log("\n[3/6] Updating Consultations appointmentId index to partial unique...");
    const consultIndexes = await db.collection("consultations").indexes();
    const apptIndex = consultIndexes.find(idx => idx.name === "appointmentId_1");
    if (apptIndex) {
      console.log("- Dropping legacy index appointmentId_1...");
      await db.collection("consultations").dropIndex("appointmentId_1");
    }
    await db.collection("consultations").createIndex(
      { appointmentId: 1 },
      { 
        unique: true, 
        partialFilterExpression: { 
          appointmentId: { $exists: true, $type: "objectId" } 
        }, 
        background: true 
      }
    );
    console.log("✓ Consultations appointmentId_1 index is now partial unique (skips unset/missing values).");

    // --------------------------------------------------------------------------
    // Phase 3: Preserve 13 Dangling Consultations
    // --------------------------------------------------------------------------
    console.log("\n[4/6] Reconciling 13 Dangling Consultations...");
    const existingApptIds = new Set(
      (await db.collection("appointments").find({}, { projection: { _id: 1 } }).toArray())
        .map(a => a._id.toString())
    );

    const allConsultations = await db.collection("consultations")
      .find({ appointmentId: { $ne: null } })
      .toArray();

    let reconciledConsultations = 0;
    for (const c of allConsultations) {
      if (c.appointmentId && !existingApptIds.has(c.appointmentId.toString())) {
        rollbackState.consultationsFix.push({
          _id: c._id.toString(),
          originalAppointmentId: c.appointmentId.toString()
        });

        await db.collection("consultations").updateOne(
          { _id: c._id },
          {
            $set: {
              legacyAppointmentId: c.appointmentId,
              updatedAt: new Date()
            },
            $unset: {
              appointmentId: ""
            }
          }
        );
        reconciledConsultations++;
      }
    }
    console.log(`✓ Reconciled ${reconciledConsultations} consultations (preserved notes, decoupled from deleted appointment IDs).`);

    // --------------------------------------------------------------------------
    // Phase 4: Preserve 13 Dangling Invoices
    // --------------------------------------------------------------------------
    console.log("\n[5/6] Reconciling 13 Dangling Invoices...");
    const allInvoices = await db.collection("invoices")
      .find({ appointmentId: { $ne: null } })
      .toArray();

    let reconciledInvoices = 0;
    for (const inv of allInvoices) {
      if (inv.appointmentId && !existingApptIds.has(inv.appointmentId.toString())) {
        rollbackState.invoicesFix.push({
          _id: inv._id.toString(),
          originalAppointmentId: inv.appointmentId.toString()
        });

        await db.collection("invoices").updateOne(
          { _id: inv._id },
          {
            $set: {
              legacyAppointmentId: inv.appointmentId,
              updatedAt: new Date()
            },
            $unset: {
              appointmentId: ""
            }
          }
        );
        reconciledInvoices++;
      }
    }
    console.log(`✓ Reconciled ${reconciledInvoices} invoices (preserved amounts, payments, decoupled from deleted appointment IDs).`);

    // --------------------------------------------------------------------------
    // Phase 5: Consolidate 12 Duplicate Patient Profiles (+91 97654 00000)
    // --------------------------------------------------------------------------
    console.log("\n[6/6] Consolidating 12 duplicate Kavita Deshmukh seed profiles...");
    const canonicalPatient = await db.collection("patients").findOne({
      $or: [
        { _id: new mongoose.Types.ObjectId("6adc03b03da6e1feca1dbbf4") },
        { _id: "6adc03b03da6e1feca1dbbf4" },
        { patientCode: "TR-NOEMAIL-0820" }
      ]
    });

    if (!canonicalPatient) {
      throw new Error("Canonical patient TR-NOEMAIL-0820 not found!");
    }

    const canonicalId = canonicalPatient._id;
    
    // Find all duplicate records sharing the phone number except the canonical one
    const duplicatePatients = await db.collection("patients").find({
      phone: "+91 97654 00000",
      _id: { $ne: canonicalId }
    }).toArray();

    console.log(`- Found ${duplicatePatients.length} duplicate patient profiles to archive & merge.`);

    for (const dup of duplicatePatients) {
      rollbackState.patientsMergeFix.mergedIds.push(dup._id.toString());

      // Re-link any invoices that point to this duplicate patient
      const linkedInvoices = await db.collection("invoices").find({ 
        $or: [
          { patientId: dup._id },
          { patientId: dup._id.toString() }
        ]
      }).toArray();

      for (const inv of linkedInvoices) {
        rollbackState.patientsMergeFix.relinkedInvoices.push({
          invoiceId: inv._id.toString(),
          originalPatientId: dup._id.toString()
        });

        await db.collection("invoices").updateOne(
          { _id: inv._id },
          { $set: { patientId: canonicalId, updatedAt: new Date() } }
        );
      }

      // Mark duplicate patient as merged & archived (ZERO deletion)
      await db.collection("patients").updateOne(
        { _id: dup._id },
        {
          $set: {
            status: "merged",
            isArchived: true,
            mergedInto: canonicalId,
            updatedAt: new Date()
          }
        }
      );
    }
    console.log(`✓ Consolidated ${duplicatePatients.length} profiles and re-linked invoices to canonical ${canonicalId}.`);

    // --------------------------------------------------------------------------
    // Post-condition Assertions & Verification
    // --------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log("Post-Migration Verification");
    console.log("================================================================================");

    const finalPatientCount = await db.collection("patients").countDocuments();
    const finalInvoiceCount = await db.collection("invoices").countDocuments();
    const finalConsultationCount = await db.collection("consultations").countDocuments();
    const finalAppointmentCount = await db.collection("appointments").countDocuments();

    console.log(`Patients:      ${initialPatientCount} -> ${finalPatientCount} (Strict Equality: ${finalPatientCount === initialPatientCount})`);
    console.log(`Invoices:      ${initialInvoiceCount} -> ${finalInvoiceCount} (Strict Equality: ${finalInvoiceCount === initialInvoiceCount})`);
    console.log(`Consultations: ${initialConsultationCount} -> ${finalConsultationCount} (Strict Equality: ${finalConsultationCount === initialConsultationCount})`);
    console.log(`Appointments:  ${initialAppointmentCount} -> ${finalAppointmentCount} (Strict Equality: ${finalAppointmentCount === initialAppointmentCount})`);

    // Check for remaining dangling appointments
    const updatedApptIds = new Set(
      (await db.collection("appointments").find({}, { projection: { _id: 1 } }).toArray())
        .map(a => a._id.toString())
    );

    const remainingDanglingConsultations = (await db.collection("consultations").find({ appointmentId: { $exists: true, $ne: null } }).toArray())
      .filter(c => !updatedApptIds.has(c.appointmentId.toString()));
    const remainingDanglingInvoices = (await db.collection("invoices").find({ appointmentId: { $exists: true, $ne: null } }).toArray())
      .filter(i => !updatedApptIds.has(i.appointmentId.toString()));

    console.log(`Remaining Dangling Consultations: ${remainingDanglingConsultations.length}`);
    console.log(`Remaining Dangling Invoices:      ${remainingDanglingInvoices.length}`);

    if (remainingDanglingConsultations.length === 0 && remainingDanglingInvoices.length === 0) {
      console.log("\n✓ ALL INTEGRITY ANOMALIES SUCCESSFULLY RECONCILED WITH ZERO DATA LOSS!");
    } else {
      throw new Error("Integrity check failed: dangling references remain.");
    }

    // Persist rollback state
    fs.mkdirSync(path.dirname(ROLLBACK_STATE_PATH), { recursive: true });
    fs.writeFileSync(ROLLBACK_STATE_PATH, JSON.stringify(rollbackState, null, 2), "utf-8");
    console.log(`✓ Reversible rollback state written to: ${ROLLBACK_STATE_PATH}`);

  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runStageBMigration();

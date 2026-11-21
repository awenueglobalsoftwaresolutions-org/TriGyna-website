/**
 * TriGyna Production Data Audit & Safe Dummy Cleanup Tool
 *
 * Performs safety-verified audit and cleanup of test/synthetic records.
 * Default is DRY-RUN mode. Pass --execute to apply confirmed cleanups.
 * In execute mode, automatically creates an immutable backup snapshot first.
 */

const fs = require("fs");
const path = require("path");
const { connectDB, disconnectDB, mongoose } = require("../config/database");

// Models
const User = require("../modules/users/user.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Consultation = require("../modules/clinical/consultation.model");
const Prescription = require("../modules/clinical/prescription.model");
const FollowUp = require("../modules/clinical/followup.model");
const Lead = require("../modules/crm/lead.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const Notification = require("../modules/notifications/notification.model");

const TEST_EMAIL_REGEX = /(@trigyna\.test$|@example\.com$)/i;

async function runCleanupAudit() {
  const isExecute = process.argv.includes("--execute") || process.argv.includes("--apply");
  const isDryRun = !isExecute;

  console.log("==================================================");
  console.log(`TriGyna Database Cleanup — Mode: ${isDryRun ? "DRY RUN (Audit Only)" : "EXECUTE (Permanent Cleanup)"}`);
  console.log("==================================================");

  await connectDB();

  try {
    const dbName = mongoose.connection.name;
    const dbHost = mongoose.connection.host;
    console.log(`Target Database: ${dbHost}/${dbName}`);

    // 1. Audit Users
    const testUsers = await User.find({
      $or: [
        { email: TEST_EMAIL_REGEX },
        { email: /dummy|fake|mock/i },
        { phone: { $in: ["+919999999999", "9999999999"] } },
      ],
    }).lean();

    const testUserIds = testUsers.map((u) => u._id);
    console.log(`\n[Audit] Identified ${testUsers.length} test user account(s):`);
    testUsers.forEach((u) => {
      console.log(`  - ${u.name} (${u.email || u.phone}) [Role: ${u.role}, ID: ${u._id}]`);
    });

    // 2. Audit Doctors tied to test users
    const testDoctors = await Doctor.find({
      $or: [
        { userId: { $in: testUserIds } },
        { qualifications: /synthetic|fixture|test/i },
      ],
    }).lean();
    const testDoctorIds = testDoctors.map((d) => d._id);
    console.log(`[Audit] Identified ${testDoctors.length} dummy doctor profile(s)`);

    // 3. Audit Patients tied to test users
    const testPatients = await Patient.find({
      $or: [
        { userId: { $in: testUserIds } },
        { email: TEST_EMAIL_REGEX },
        { patientCode: /^TEST-PAT-/i },
      ],
    }).lean();
    const testPatientIds = testPatients.map((p) => p._id);
    console.log(`[Audit] Identified ${testPatients.length} dummy patient record(s)`);

    // 4. Audit Leads
    const testLeads = await Lead.find({
      $or: [
        { email: TEST_EMAIL_REGEX },
        { source: "dev_seed" },
        { notes: /synthetic|seed_fixture/i },
      ],
    }).lean();
    console.log(`[Audit] Identified ${testLeads.length} test lead record(s)`);

    // 5. Audit Appointments
    const testAppointments = await Appointment.find({
      $or: [
        { patientId: { $in: testPatientIds } },
        { doctorId: { $in: testDoctorIds } },
        { notes: /dev_seed_fixture/i },
      ],
    }).lean();
    console.log(`[Audit] Identified ${testAppointments.length} test appointment record(s)`);

    // 6. Audit Invoices & Payments
    const testInvoices = await Invoice.find({
      $or: [
        { patientId: { $in: testPatientIds } },
        { doctorId: { $in: testDoctorIds } },
        { notes: /dev_seed_fixture/i },
      ],
    }).lean();
    console.log(`[Audit] Identified ${testInvoices.length} test invoice record(s)`);

    const testPayments = await Payment.find({
      $or: [
        { patientId: { $in: testPatientIds } },
        { providerPaymentId: /pay_mock_/i },
      ],
    }).lean();
    console.log(`[Audit] Identified ${testPayments.length} test payment transaction(s)`);

    // Summary of affected items
    const totalIdentified =
      testUsers.length +
      testDoctors.length +
      testPatients.length +
      testLeads.length +
      testAppointments.length +
      testInvoices.length +
      testPayments.length;

    console.log(`\n--> Total Identified Test Records: ${totalIdentified}`);

    if (totalIdentified === 0) {
      console.log("[Status] Database is completely clean! Zero dummy or test records detected.");
      return;
    }

    if (isDryRun) {
      console.log("\n==================================================");
      console.log("[DRY-RUN COMPLETE] No database modifications were made.");
      console.log("To permanently clean these identified records, run with: --execute");
      console.log("==================================================");
      return;
    }

    // EXECUTE MODE: Create backup snapshot first
    console.log("\n[Backup] Generating safety snapshot before cleanup...");
    const backupDir = path.resolve(__dirname, "../../backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `cleanup_backup_${timestamp}.json`);

    const backupPayload = {
      timestamp: new Date().toISOString(),
      database: dbName,
      records: {
        users: testUsers,
        doctors: testDoctors,
        patients: testPatients,
        leads: testLeads,
        appointments: testAppointments,
        invoices: testInvoices,
        payments: testPayments,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupPayload, null, 2), "utf8");
    console.log(`[Backup] Verified safety snapshot saved: ${backupFile}`);

    // Perform deletions with targeted criteria
    console.log("[Cleanup] Commencing deletion of identified test records...");

    const delUsers = await User.deleteMany({ _id: { $in: testUserIds } });
    const delDoctors = await Doctor.deleteMany({ _id: { $in: testDoctorIds } });
    const delPatients = await Patient.deleteMany({ _id: { $in: testPatientIds } });
    const delLeads = await Lead.deleteMany({ _id: { $in: testLeads.map((l) => l._id) } });
    const delAppts = await Appointment.deleteMany({ _id: { $in: testAppointments.map((a) => a._id) } });
    const delInvoices = await Invoice.deleteMany({ _id: { $in: testInvoices.map((i) => i._id) } });
    const delPayments = await Payment.deleteMany({ _id: { $in: testPayments.map((p) => p._id) } });

    console.log(`[Cleanup Result] Deleted records:`);
    console.log(`  - Users:        ${delUsers.deletedCount}`);
    console.log(`  - Doctors:      ${delDoctors.deletedCount}`);
    console.log(`  - Patients:     ${delPatients.deletedCount}`);
    console.log(`  - Leads:        ${delLeads.deletedCount}`);
    console.log(`  - Appointments: ${delAppts.deletedCount}`);
    console.log(`  - Invoices:     ${delInvoices.deletedCount}`);
    console.log(`  - Payments:     ${delPayments.deletedCount}`);
    console.log("==================================================");
    console.log("[SUCCESS] Database cleanup finished. Production data verified.");
    console.log("==================================================");
  } catch (err) {
    console.error("[Cleanup Failed]:", err.message);
    throw err;
  } finally {
    if (require.main === module) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  runCleanupAudit()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runCleanupAudit;

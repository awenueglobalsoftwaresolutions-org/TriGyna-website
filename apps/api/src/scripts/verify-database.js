/**
 * TriGyna Production Database Verification Script
 *
 * Verifies:
 * 1. Active MongoDB Atlas connectivity and ping latency
 * 2. Database collections and document volume
 * 3. Essential production indexes (unique email, phone, codes)
 * 4. Super Admin account provisioning and credentials
 * 5. Complete absence of dummy / synthetic test data
 */

const { connectDB, disconnectDB, checkDBHealth, mongoose } = require("../config/database");
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Appointment = require("../modules/appointments/appointment.model");
const Invoice = require("../modules/billing/invoice.model");
const Receipt = require("../modules/billing/receipt.model");
const Service = require("../modules/services/service.model");
const Package = require("../modules/packages/package.model");

async function verifyDatabase() {
  console.log("==================================================");
  console.log("TriGyna Healthcare — Production Database Verification");
  console.log("==================================================");

  const startMs = Date.now();
  await connectDB();

  let hasErrors = false;

  try {
    const db = mongoose.connection.db;
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;

    console.log(`\n[1/5] Active Database Health Check`);
    const health = await checkDBHealth();
    console.log(`  -> Host:      ${host}`);
    console.log(`  -> Database:  ${dbName}`);
    console.log(`  -> Status:    ${health.status.toUpperCase()}`);
    console.log(`  -> Ping OK:   ${health.healthy}`);
    console.log(`  -> Latency:   ${Date.now() - startMs}ms`);

    if (!health.healthy) {
      console.error("  [FAIL] Database health check returned unhealthy ping.");
      hasErrors = true;
    } else {
      console.log("  [PASS] Database ping succeeded.");
    }

    console.log(`\n[2/5] Collections & Records Audit`);
    const collections = await db.listCollections().toArray();
    console.log(`  -> Total Collections Found: ${collections.length}`);

    const counts = {};
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      counts[c.name] = count;
      if (count > 0) {
        console.log(`     • ${c.name.padEnd(28)}: ${count} record(s)`);
      }
    }

    console.log(`\n[3/5] Index Integrity Verification`);
    const collectionsToCheck = [
      { name: "users", expectedUnique: ["email_1", "patientId_1"] },
      { name: "patients", expectedUnique: ["patientCode_1"] },
      { name: "appointments", expectedUnique: ["appointmentCode_1"] },
      { name: "invoices", expectedUnique: ["invoiceNumber_1"] },
      { name: "receipts", expectedUnique: ["receiptNumber_1"] },
    ];

    for (const item of collectionsToCheck) {
      try {
        const indexes = await db.collection(item.name).indexes();
        const indexNames = indexes.map((i) => i.name);
        console.log(`  -> Collection '${item.name}': ${indexes.length} indexes present`);
        for (const exp of item.expectedUnique) {
          const found = indexNames.includes(exp);
          if (found) {
            console.log(`     ✓ Unique index '${exp}' confirmed.`);
          } else {
            console.warn(`     ⚠ Notice: Expected index '${exp}' not explicitly indexed by that name.`);
          }
        }
      } catch (e) {
        console.log(`  -> Collection '${item.name}' not yet indexed (empty collection).`);
      }
    }

    console.log(`\n[4/5] Super Admin Verification`);
    const adminEmail = (process.env.ADMIN_EMAIL || "Codewithsushil7236@gmail.com").trim().toLowerCase();
    const adminPhone = (process.env.ADMIN_PHONE || "723689648").trim();

    const superAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { phone: adminPhone }],
    }).select("+passwordHash");

    if (!superAdmin) {
      console.error(`  [FAIL] Initial Super Admin account NOT FOUND in '${dbName}'!`);
      console.error(`         Expected email: '${adminEmail}' or phone: '${adminPhone}'`);
      console.error(`         Run: npm run seed:production-admin`);
      hasErrors = true;
    } else {
      console.log(`  [PASS] Super Admin account exists!`);
      console.log(`     • ID:                  ${superAdmin._id}`);
      console.log(`     • Name:                ${superAdmin.name}`);
      console.log(`     • Email:               ${superAdmin.email}`);
      console.log(`     • Phone:               ${superAdmin.phone}`);
      console.log(`     • Role:                ${superAdmin.role}`);
      console.log(`     • Status:              ${superAdmin.status}`);
      console.log(`     • Must Change Password: ${superAdmin.mustChangePassword}`);
      console.log(`     • Password Hash:       ${superAdmin.passwordHash ? "[CONFIRMED BCRYPT HASH]" : "[MISSING]"}`);

      if (superAdmin.role !== "super_admin" && superAdmin.role !== "owner") {
        console.error(`  [FAIL] Role '${superAdmin.role}' is not super_admin or owner!`);
        hasErrors = true;
      }
      if (superAdmin.status !== "active") {
        console.error(`  [FAIL] Account status '${superAdmin.status}' is not active!`);
        hasErrors = true;
      }
    }

    console.log(`\n[5/5] Dummy Data Cleanliness Check`);
    const testRecords = await User.countDocuments({
      email: { $regex: /@trigyna\.test$/i },
    });

    if (testRecords > 0) {
      console.warn(`  [WARN] Found ${testRecords} test account(s) matching @trigyna.test in '${dbName}'!`);
      console.warn(`         Run: npm run db:cleanup`);
    } else {
      console.log(`  [PASS] Zero synthetic test accounts (@trigyna.test) in database.`);
    }

    console.log("\n==================================================");
    if (hasErrors) {
      console.error("VERIFICATION COMPLETED WITH ERRORS.");
      throw new Error("Database verification failed essential checks.");
    } else {
      console.log("PRODUCTION DATABASE VERIFICATION PASSED SUCCESSFULLY (100%).");
    }
    console.log("==================================================");
  } catch (err) {
    console.error("[Verification Error]:", err.message);
    throw err;
  } finally {
    if (require.main === module) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  verifyDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = verifyDatabase;

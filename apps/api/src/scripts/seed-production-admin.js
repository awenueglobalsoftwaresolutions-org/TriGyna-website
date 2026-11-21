/**
 * TriGyna Production Super Admin Seed Script
 *
 * Provisions the initial, canonical Super Admin account for TriGyna Production.
 * Idempotent: Verifies existing account, does not duplicate or overwrite existing passwords.
 * Password is NEVER hardcoded; supplied securely via ADMIN_INITIAL_PASSWORD.
 */

const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const { recordAudit } = require("../modules/audit/audit.service");

async function seedProductionAdmin() {
  console.log("==================================================");
  console.log("TriGyna Healthcare — Production Super Admin Seed");
  console.log("==================================================");

  await connectDB();

  try {
    // 1. Ensure indexes are built on MongoDB
    await User.init();

    // 2. Resolve admin profile details
    const adminName = (process.env.ADMIN_NAME || "Sushil Kumar Kushwaha").trim();
    const adminEmail = (process.env.ADMIN_EMAIL || "Codewithsushil7236@gmail.com").trim().toLowerCase();
    const adminPhone = (process.env.ADMIN_PHONE || "723689648").trim();
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      throw new Error(`Invalid ADMIN_EMAIL format: '${adminEmail}'`);
    }

    // Validate phone number
    if (!adminPhone || adminPhone.length < 7) {
      throw new Error(`Invalid ADMIN_PHONE format: '${adminPhone}'`);
    }

    // 3. Idempotency Check: search by normalized email or phone
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { phone: adminPhone }],
    });

    const shouldUpdatePassword =
      process.env.ADMIN_UPDATE_PASSWORD === "true" ||
      process.argv.includes("--update-password") ||
      process.argv.includes("--force-update-password");

    if (existingAdmin) {
      let updated = false;
      if (existingAdmin.role !== "super_admin") {
        existingAdmin.role = "super_admin";
        updated = true;
      }
      if (existingAdmin.status !== "active") {
        existingAdmin.status = "active";
        updated = true;
      }
      if (shouldUpdatePassword && initialPassword) {
        if (initialPassword.length < 8) {
          throw new Error("New password must be at least 8 characters!");
        }
        const salt = await bcrypt.genSalt(12);
        existingAdmin.passwordHash = await bcrypt.hash(initialPassword, salt);
        existingAdmin.mustChangePassword = true;
        updated = true;
        console.log(`[SuperAdmin Seed] Password successfully updated and hashed (bcrypt 12 rounds).`);
      }
      if (updated) {
        await existingAdmin.save();
      }

      console.log(`[SuperAdmin Seed] Account found in database.`);
      console.log(`  -> ID:     ${existingAdmin._id}`);
      console.log(`  -> Name:   ${existingAdmin.name}`);
      console.log(`  -> Email:  ${existingAdmin.email}`);
      console.log(`  -> Phone:  ${existingAdmin.phone}`);
      console.log(`  -> Role:   ${existingAdmin.role}`);
      console.log(`  -> Status: ${existingAdmin.status}`);
      if (!shouldUpdatePassword) {
        console.log(`[SuperAdmin Seed] Existing password preserved. (Pass --update-password to change)`);
      }
      return { created: false, user: existingAdmin, passwordUpdated: shouldUpdatePassword };
    }

    // If account does not exist, verify initial password is provided
    if (!initialPassword || initialPassword.length < 8) {
      throw new Error(
        "ADMIN_INITIAL_PASSWORD environment variable must be set with at least 8 characters to provision the initial Super Admin account!"
      );
    }

    // 4. Secure Password Hashing (bcrypt with 12 rounds for high security)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(initialPassword, salt);

    // 5. Create Canonical Super Admin
    const superAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      role: "super_admin",
      status: "active",
      mustChangePassword: true,
      authVersion: 1,
      securityHistory: [
        {
          action: "SUPER_ADMIN_INITIAL_PROVISION",
          timestamp: new Date(),
          details: { role: "super_admin", seededVia: "backend_cli" },
        },
      ],
    });

    // 6. Record Audit Log
    try {
      await recordAudit({
        actorRole: "system",
        action: "SUPER_ADMIN_PROVISIONED",
        targetEntity: "User",
        targetId: superAdmin._id.toString(),
        details: { email: superAdmin.email, phone: superAdmin.phone, role: "super_admin" },
      });
    } catch {
      // Audit non-fatal on initial seed
    }

    console.log(`[SuperAdmin Seed] SUCCESS: Super Admin account successfully provisioned!`);
    console.log(`  -> ID:                  ${superAdmin._id}`);
    console.log(`  -> Name:                ${superAdmin.name}`);
    console.log(`  -> Email:               ${superAdmin.email}`);
    console.log(`  -> Phone:               ${superAdmin.phone}`);
    console.log(`  -> Role:                ${superAdmin.role}`);
    console.log(`  -> Status:              ${superAdmin.status}`);
    console.log(`  -> Must Change Password: true (Enforced on first login)`);
    console.log(`[SuperAdmin Seed] Note: Password hashed securely. Plaintext never stored or logged.`);

    return { created: true, user: superAdmin };
  } catch (error) {
    console.error("[SuperAdmin Seed] FAILED to seed Super Admin:", error.message);
    throw error;
  } finally {
    if (require.main === module) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  seedProductionAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedProductionAdmin;

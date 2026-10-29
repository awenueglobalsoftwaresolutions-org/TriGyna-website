const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const { recordAudit } = require("../modules/audit/audit.service");

async function bootstrapOwner() {
  console.log("--------------------------------------------------");
  console.log("TriGyna Platform — Secure Owner Account Provisioning");
  console.log("--------------------------------------------------");

  await connectDB();

  try {
    const existingOwner = await User.findOne({ role: "owner" });
    if (existingOwner) {
      console.log(`[Bootstrap] An Owner account already exists: ${existingOwner.name} (${existingOwner.phone})`);
      console.log("[Bootstrap] Safe guard active: Provisioning aborted to avoid overwriting existing owner.");
      return;
    }

    // Default configuration for initial clinic owner
    const ownerName = process.env.OWNER_NAME || "Sushil Kushwaha";
    const ownerEmail = (process.env.OWNER_EMAIL || "trigyna.health@gmail.com").toLowerCase();
    const ownerPhone = process.env.OWNER_PHONE || "+919172772326";
    const ownerPassword = process.env.OWNER_PASSWORD || "TriGyna@2326";

    const passwordHash = await User.hashPassword(ownerPassword);

    const owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      passwordHash,
      role: "owner",
      status: "active",
    });

    await recordAudit({
      actorRole: "system",
      action: "OWNER_BOOTSTRAP_PROVISIONED",
      targetEntity: "User",
      targetId: owner._id.toString(),
      details: { email: owner.email, phone: owner.phone },
    });

    console.log(`[Bootstrap] Owner account successfully provisioned!`);
    console.log(`[Bootstrap] ID: ${owner._id}`);
    console.log(`[Bootstrap] Name: ${owner.name}`);
    console.log(`[Bootstrap] Email: ${owner.email}`);
    console.log(`[Bootstrap] Phone: ${owner.phone}`);
    console.log(`[Bootstrap] Status: active`);
    console.log(`[Bootstrap] Note: Initial credentials configured safely in database.`);
  } catch (error) {
    console.error("[Bootstrap] Failed to provision owner:", error.message);
  } finally {
    if (require.main === module) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  bootstrapOwner();
}

module.exports = bootstrapOwner;

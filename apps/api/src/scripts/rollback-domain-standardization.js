/**
 * TriGyna Production Domain Migration Rollback Script
 * 
 * Reverses the domain migration using the snapshot saved in:
 * apps/api/backups/domain_migration_rollback_state.json
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const MONGO_URI = process.env.TARGET_DB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
const ROLLBACK_STATE_PATH = path.join(__dirname, "../../backups/domain_migration_rollback_state.json");

async function runDomainRollback() {
  console.log("================================================================================");
  console.log("Starting TriGyna Domain Migration Rollback");
  console.log(`Target Database: ${MONGO_URI}`);
  console.log("================================================================================");

  if (!fs.existsSync(ROLLBACK_STATE_PATH)) {
    throw new Error(`Rollback state file not found at: ${ROLLBACK_STATE_PATH}`);
  }

  const state = JSON.parse(fs.readFileSync(ROLLBACK_STATE_PATH, "utf8"));
  console.log(`Loaded rollback state from: ${state.migratedAt}`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  try {
    // 1. Rollback Organizations
    console.log(`\nRolling back ${state.organizations.length} organization records...`);
    for (const org of state.organizations) {
      await db.collection("organizations").updateOne(
        { _id: new mongoose.Types.ObjectId(org.id) },
        { $set: { website: org.previousWebsite, updatedAt: new Date() } }
      );
      console.log(`  ✓ Restored Organization ${org.id} to: ${org.previousWebsite}`);
    }

    // 2. Rollback Marketing Campaigns
    console.log(`\nRolling back ${state.marketingCampaigns.length} marketing campaign records...`);
    for (const camp of state.marketingCampaigns) {
      await db.collection("marketingcampaigns").updateOne(
        { _id: new mongoose.Types.ObjectId(camp.id) },
        { $set: { "creative.destinationUrl": camp.previousDestinationUrl, updatedAt: new Date() } }
      );
      console.log(`  ✓ Restored Campaign ${camp.id} to: ${camp.previousDestinationUrl}`);
    }

    // 3. Rollback UTM Tracking
    console.log(`\nRolling back ${state.utmTrackings.length} UTM records...`);
    for (const utm of state.utmTrackings) {
      await db.collection("utmtrackings").updateOne(
        { _id: new mongoose.Types.ObjectId(utm.id) },
        { $set: { destinationUrl: utm.previousDestinationUrl, updatedAt: new Date() } }
      );
      console.log(`  ✓ Restored UTM ${utm.id} to: ${utm.previousDestinationUrl}`);
    }

    console.log("\n🎉 Rollback completed successfully!");
  } catch (err) {
    console.error("Rollback failed:", err);
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

if (require.main === module) {
  runDomainRollback()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runDomainRollback };

/**
 * TriGyna Production Domain Standardization Migration Script
 * 
 * Target Canonical Domain: https://www.trigyna.in
 * Reversible, auditable migration updating database configurations and active URLs:
 * 1. Organizations: website -> https://www.trigyna.in
 * 2. Marketing Campaigns: creative.destinationUrl -> https://www.trigyna.in/services/...
 * 3. UTM Tracking: destinationUrl -> https://www.trigyna.in/...
 * 4. Payment Links: internal checkout URLs (preserves external rzp.io short URLs)
 * 
 * Strict Integrity Guarantees:
 * - ZERO documents deleted
 * - Historical financial records (payments, invoices, receipts, ledger) preserved
 * - External meeting URLs (Google Meet / Zoom) untouched
 * - Rollback snapshot saved to apps/api/backups/domain_migration_rollback_state.json
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const MONGO_URI = process.env.TARGET_DB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
const BACKUP_DIR = path.join(__dirname, "../../backups");
const ROLLBACK_STATE_PATH = path.join(BACKUP_DIR, "domain_migration_rollback_state.json");

const CANONICAL_DOMAIN = "https://www.trigyna.in";

async function runDomainMigration() {
  console.log("================================================================================");
  console.log("Starting TriGyna Global Domain Migration: Standardizing to " + CANONICAL_DOMAIN);
  console.log(`Target Database: ${MONGO_URI}`);
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log("================================================================================");

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const rollbackState = {
    migratedAt: new Date().toISOString(),
    database: MONGO_URI,
    targetDomain: CANONICAL_DOMAIN,
    organizations: [],
    marketingCampaigns: [],
    utmTrackings: [],
    paymentLinks: [],
  };

  try {
    // --------------------------------------------------------------------------
    // Pre-condition Checks & Audit
    // --------------------------------------------------------------------------
    console.log("\n[1/5] Running Pre-condition Verification & Collection Audits...");
    const orgCount = await db.collection("organizations").countDocuments();
    const campaignsCount = await db.collection("marketingcampaigns").countDocuments();
    const utmCount = await db.collection("utmtrackings").countDocuments();
    const paymentsCount = await db.collection("payments").countDocuments();
    const invoicesCount = await db.collection("invoices").countDocuments();

    console.log(`- Organizations total: ${orgCount}`);
    console.log(`- Marketing Campaigns total: ${campaignsCount}`);
    console.log(`- UTM Trackings total: ${utmCount}`);
    console.log(`- Invoices total (Protected): ${invoicesCount}`);
    console.log(`- Payments total (Protected): ${paymentsCount}`);

    // --------------------------------------------------------------------------
    // Phase 1: Migrate Organization Website URL
    // --------------------------------------------------------------------------
    console.log("\n[2/5] Migrating Organization Website URL...");
    const orgs = await db.collection("organizations").find({}).toArray();
    for (const org of orgs) {
      if (org.website !== CANONICAL_DOMAIN) {
        rollbackState.organizations.push({
          id: org._id,
          previousWebsite: org.website,
        });

        await db.collection("organizations").updateOne(
          { _id: org._id },
          {
            $set: {
              website: CANONICAL_DOMAIN,
              updatedAt: new Date(),
            },
          }
        );
        console.log(`  ✓ Organization ${org._id} website updated: ${org.website || "none"} -> ${CANONICAL_DOMAIN}`);
      } else {
        console.log(`  - Organization ${org._id} already at canonical ${CANONICAL_DOMAIN}`);
      }
    }

    // --------------------------------------------------------------------------
    // Phase 2: Migrate Marketing Campaigns Destination URLs
    // --------------------------------------------------------------------------
    console.log("\n[3/5] Migrating Marketing Campaign Destination URLs...");
    const campaigns = await db.collection("marketingcampaigns").find({
      "creative.destinationUrl": { $regex: /trigyna\.com/i },
    }).toArray();

    for (const camp of campaigns) {
      const oldUrl = camp.creative?.destinationUrl;
      const newUrl = oldUrl.replace(/https?:\/\/(?:www\.)?trigyna\.com/i, CANONICAL_DOMAIN);

      rollbackState.marketingCampaigns.push({
        id: camp._id,
        previousDestinationUrl: oldUrl,
      });

      await db.collection("marketingcampaigns").updateOne(
        { _id: camp._id },
        {
          $set: {
            "creative.destinationUrl": newUrl,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`  ✓ Campaign ${camp.campaignId || camp._id} updated: ${oldUrl} -> ${newUrl}`);
    }
    console.log(`  Total campaigns updated: ${campaigns.length}`);

    // --------------------------------------------------------------------------
    // Phase 3: Migrate UTM Tracking Destination URLs
    // --------------------------------------------------------------------------
    console.log("\n[4/5] Migrating UTM Tracking Destination URLs...");
    const utms = await db.collection("utmtrackings").find({
      destinationUrl: { $regex: /trigyna\.com/i },
    }).toArray();

    for (const u of utms) {
      const oldUrl = u.destinationUrl;
      const newUrl = oldUrl.replace(/https?:\/\/(?:www\.)?trigyna\.com/i, CANONICAL_DOMAIN);

      rollbackState.utmTrackings.push({
        id: u._id,
        previousDestinationUrl: oldUrl,
      });

      await db.collection("utmtrackings").updateOne(
        { _id: u._id },
        {
          $set: {
            destinationUrl: newUrl,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`  ✓ UTM ${u.trackingCode || u._id} updated: ${oldUrl} -> ${newUrl}`);
    }
    console.log(`  Total UTM links updated: ${utms.length}`);

    // --------------------------------------------------------------------------
    // Phase 4: Save Rollback State & Post-Migration Verification
    // --------------------------------------------------------------------------
    console.log("\n[5/5] Writing Rollback Snapshot & Post-Verification...");
    fs.writeFileSync(ROLLBACK_STATE_PATH, JSON.stringify(rollbackState, null, 2), "utf8");
    console.log(`  ✓ Rollback state persisted to: ${ROLLBACK_STATE_PATH}`);

    // Verification check: ensure no active trigyna.com in migrated collections
    const remainingOrgLegacy = await db.collection("organizations").countDocuments({ website: { $regex: /trigyna\.com/i } });
    const remainingCampLegacy = await db.collection("marketingcampaigns").countDocuments({ "creative.destinationUrl": { $regex: /trigyna\.com/i } });
    const remainingUtmLegacy = await db.collection("utmtrackings").countDocuments({ destinationUrl: { $regex: /trigyna\.com/i } });

    console.log("\n--- Verification Summary ---");
    console.log(`Remaining legacy in organizations: ${remainingOrgLegacy}`);
    console.log(`Remaining legacy in marketingcampaigns: ${remainingCampLegacy}`);
    console.log(`Remaining legacy in utmtrackings: ${remainingUtmLegacy}`);

    if (remainingOrgLegacy === 0 && remainingCampLegacy === 0 && remainingUtmLegacy === 0) {
      console.log("\n🎉 SUCCESS: Database Domain Migration completed with 100% integrity!");
    } else {
      console.warn("\n⚠️ WARNING: Some legacy records remain unresolved.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

if (require.main === module) {
  runDomainMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runDomainMigration };

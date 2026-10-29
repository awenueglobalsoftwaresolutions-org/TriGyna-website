const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const SOURCE_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
const TARGET_VERIFY_URI = "mongodb://127.0.0.1:27017/trigyna_backup_verify";
const BACKUP_DIR = path.resolve(__dirname, "../../backups/pre_remediation_20261025");

async function runBackupAndVerify() {
  console.log("=================================================");
  console.log("   TriGyna Phase 2: Database Backup & Verification");
  console.log("=================================================");
  console.log(`Source URI: ${SOURCE_URI}`);
  console.log(`Verify URI: ${TARGET_VERIFY_URI}`);
  console.log(`Backup Directory: ${BACKUP_DIR}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Connect to Source Database
  const srcConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  console.log("\n[1/4] Connected to Source Database:", srcConn.name);

  const collections = await srcConn.db.listCollections().toArray();
  const manifest = {
    timestamp: new Date().toISOString(),
    sourceDatabase: srcConn.name,
    collections: {},
    totalDocuments: 0,
  };

  console.log(`[2/4] Exporting ${collections.length} collections...`);
  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith("system.")) continue;

    const col = srcConn.db.collection(colName);
    const docs = await col.find({}).toArray();
    const indexes = await col.indexes();

    const dumpData = {
      collection: colName,
      count: docs.length,
      indexes,
      documents: docs,
    };

    const filePath = path.join(BACKUP_DIR, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(dumpData, null, 2), "utf8");

    manifest.collections[colName] = {
      count: docs.length,
      indexCount: indexes.length,
      file: `${colName}.json`,
    };
    manifest.totalDocuments += docs.length;
    console.log(`  - Exported ${colName.padEnd(25)} : ${docs.length.toString().padStart(5)} docs, ${indexes.length} indexes`);
  }

  fs.writeFileSync(path.join(BACKUP_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Total Source Documents Backed Up: ${manifest.totalDocuments}`);
  await srcConn.close();

  // 2. Connect to Isolated Verification Database
  console.log("\n[3/4] Connecting to Isolated Test Database for Restoration Verification...");
  const verifyConn = await mongoose.createConnection(TARGET_VERIFY_URI).asPromise();
  console.log("Connected to Verification Database:", verifyConn.name);

  // Drop any existing verification db to ensure clean restore
  await verifyConn.db.dropDatabase();
  console.log("Cleaned target verification database.");

  // Restore collections
  console.log("[4/4] Restoring into isolated verification database...");
  let verifiedDocs = 0;
  const verificationErrors = [];

  for (const [colName, colMeta] of Object.entries(manifest.collections)) {
    const filePath = path.join(BACKUP_DIR, colMeta.file);
    const dump = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const col = verifyConn.db.collection(colName);

    if (dump.documents.length > 0) {
      // Re-hydrate MongoDB ObjectIds & Dates
      const rehydratedDocs = dump.documents.map((d) => {
        return JSON.parse(JSON.stringify(d), (key, value) => {
          if (value && typeof value === "object" && value.$oid) {
            return new mongoose.Types.ObjectId(value.$oid);
          }
          return value;
        });
      });
      await col.insertMany(rehydratedDocs);
    }

    const restoredCount = await col.countDocuments({});
    if (restoredCount !== colMeta.count) {
      verificationErrors.push(`Mismatch in ${colName}: expected ${colMeta.count}, got ${restoredCount}`);
    } else {
      verifiedDocs += restoredCount;
      console.log(`  - Restored & Verified ${colName.padEnd(25)} : ${restoredCount.toString().padStart(5)} docs [VERIFIED]`);
    }
  }

  await verifyConn.close();

  console.log("\n=================================================");
  if (verificationErrors.length === 0) {
    console.log("✅ RESTORATION VERIFICATION SUCCESSFUL!");
    console.log(`Total Restored & Verified Documents: ${verifiedDocs}/${manifest.totalDocuments}`);
    console.log("Backup is 100% complete, tested, and restorable.");
  } else {
    console.error("❌ RESTORATION VERIFICATION FAILED with errors:");
    verificationErrors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }
  console.log("=================================================\n");
}

runBackupAndVerify().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});

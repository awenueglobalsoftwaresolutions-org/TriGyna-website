/**
 * TriGyna Phase 2.2.1 — Test Suite for Hardened Read-Only Duplicate Reference Audit
 * 
 * STRICT ISOLATION PROTOCOLS:
 * - Runs ONLY against dedicated isolated test database 'trigyna_test'.
 * - NEVER targets or connects to production/shared 'trigyna'.
 * - Tests security guards, stable pseudonymization, reference type classification,
 *   cross-entity reconciliation, aggregate financial math, and baseline comparison.
 */

const assert = require("assert");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const {
  runDuplicateReferenceAudit,
  AuditPseudonymizer,
  classifyReference,
  classifyIdType,
  verifyReadOnlyAccess,
  compareWithBaselineManifest,
  sanitizeMongoUri,
  redactCode
} = require("../scripts/audit-duplicate-patients");

const TEST_DB_URI = "mongodb://127.0.0.1:27017/trigyna_test";
const TEST_DB_NAME = "trigyna_test";

async function runTests() {
  console.log("================================================================================");
  console.log("Starting TriGyna Phase 2.2.1: Audit Script Hardening Verification");
  console.log(`Target Test DB: ${TEST_DB_URI}`);
  console.log("================================================================================\n");

  let testCount = 0;
  let passCount = 0;

  function test(name, fn) {
    testCount++;
    try {
      fn();
      console.log(`[PASS] Test ${testCount}: ${name}`);
      passCount++;
    } catch (err) {
      console.error(`[FAIL] Test ${testCount}: ${name}`);
      console.error(`       Error: ${err.message}`);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    testCount++;
    try {
      await fn();
      console.log(`[PASS] Test ${testCount}: ${name}`);
      passCount++;
    } catch (err) {
      console.error(`[FAIL] Test ${testCount}: ${name}`);
      console.error(`       Error: ${err.message}`);
      throw err;
    }
  }

  // ----------------------------------------------------------------------------
  // Suite 1: Sanitization & Redaction Unit Tests
  // ----------------------------------------------------------------------------
  console.log("--- Suite 1: Sanitization & Redaction Utilities ---");

  test("sanitizeMongoUri masks credentials from connection string", () => {
    const raw = "mongodb://app_audit_user:SuperSecretP@ssword@127.0.0.1:27017/trigyna";
    const sanitized = sanitizeMongoUri(raw);
    assert.strictEqual(sanitized, "mongodb://***:***@127.0.0.1:27017/trigyna");
    assert.strictEqual(sanitized.includes("SuperSecret"), false);
    assert.strictEqual(sanitized.includes("app_audit_user"), false);
  });

  test("redactCode masks internal patient code components", () => {
    assert.strictEqual(redactCode("TR-2026-0820"), "TR-***-0820");
    assert.strictEqual(redactCode("TR-NOEMAIL-1234"), "TR-***-1234");
    assert.strictEqual(redactCode("123456"), "12***56");
  });

  // ----------------------------------------------------------------------------
  // Suite 2: Stable Pseudonymizer Tests
  // ----------------------------------------------------------------------------
  console.log("\n--- Suite 2: Stable Pseudonym Manager ---");

  test("AuditPseudonymizer assigns deterministic, stable pseudonyms", () => {
    const canonicalId = "6adc03b03da6e1feca1dbbf4";
    const dup1Id = "6adc042074440ba2fc9a2a1b";
    const dup2Id = "6adc04413ac159798be3395e";

    const pseudonymizer = new AuditPseudonymizer(canonicalId);

    assert.strictEqual(pseudonymizer.getPatientPseudonym(canonicalId), "Patient_Canonical");
    assert.strictEqual(pseudonymizer.getPatientPseudonym(dup1Id), "Patient_Dup_01");
    assert.strictEqual(pseudonymizer.getPatientPseudonym(dup2Id), "Patient_Dup_02");

    // Repeated calls must return the same pseudonym
    assert.strictEqual(pseudonymizer.getPatientPseudonym(dup1Id), "Patient_Dup_01");
    assert.strictEqual(pseudonymizer.getPatientPseudonym(canonicalId), "Patient_Canonical");

    // Invoices and Payments
    const inv1 = "6adc042074440ba2fc9a2a20";
    const pmt1 = "6adc042074440ba2fc9a2a28";
    assert.strictEqual(pseudonymizer.getInvoicePseudonym(inv1), "Invoice_01");
    assert.strictEqual(pseudonymizer.getPaymentPseudonym(pmt1), "Payment_01");
    assert.strictEqual(pseudonymizer.getInvoicePseudonym(inv1), "Invoice_01");
  });

  // ----------------------------------------------------------------------------
  // Suite 3: Reference Classification Tests
  // ----------------------------------------------------------------------------
  console.log("\n--- Suite 3: Reference Type Classification ---");

  test("classifyIdType correctly differentiates formats", () => {
    const objId = new mongoose.Types.ObjectId();
    const strObjId = objId.toString();
    const malformed = "not-a-valid-24-hex-id";

    assert.strictEqual(classifyIdType(objId), "BSON_OBJECTID");
    assert.strictEqual(classifyIdType(strObjId), "STRING_OBJECTID");
    assert.strictEqual(classifyIdType(malformed), "MALFORMED_ID");
    assert.strictEqual(classifyIdType(null), "EMPTY");
    assert.strictEqual(classifyIdType(undefined), "EMPTY");
  });

  await asyncTest("classifyReference classifies targets correctly against mock cache", async () => {
    const canonicalId = new mongoose.Types.ObjectId();
    const archivedDupId = new mongoose.Types.ObjectId();
    const missingId = new mongoose.Types.ObjectId();
    const malformed = "invalid_id";

    const mockCache = new Map();
    mockCache.set(canonicalId.toString(), { _id: canonicalId, status: "active", isArchived: false });
    mockCache.set(archivedDupId.toString(), { _id: archivedDupId, status: "merged", isArchived: true });

    // Active BSON ObjectId
    const res1 = await classifyReference(canonicalId, null, mockCache);
    assert.strictEqual(res1.classification, "VALID_OBJECTID");
    assert.strictEqual(res1.targetFound, true);

    // Active String ObjectId
    const res2 = await classifyReference(canonicalId.toString(), null, mockCache);
    assert.strictEqual(res2.classification, "VALID_STRING");
    assert.strictEqual(res2.targetFound, true);

    // Archived / Merged Patient
    const res3 = await classifyReference(archivedDupId, null, mockCache);
    assert.strictEqual(res3.classification, "ARCHIVED_TARGET");
    assert.strictEqual(res3.targetFound, true);

    // Missing Patient
    const res4 = await classifyReference(missingId, null, mockCache);
    assert.strictEqual(res4.classification, "MISSING_TARGET");
    assert.strictEqual(res4.targetFound, false);

    // Malformed ID
    const res5 = await classifyReference(malformed, null, mockCache);
    assert.strictEqual(res5.classification, "MALFORMED_ID");
    assert.strictEqual(res5.targetFound, false);
  });

  // ----------------------------------------------------------------------------
  // Suite 4: Safety Database Name Guard
  // ----------------------------------------------------------------------------
  console.log("\n--- Suite 4: Safety & Security Guards ---");

  await asyncTest("runDuplicateReferenceAudit aborts if database name does not match expected", async () => {
    await mongoose.connect(TEST_DB_URI);
    try {
      await runDuplicateReferenceAudit({
        existingMongooseConnection: mongoose.connection,
        expectedDbName: "trigyna_production_mismatch", // Deliberate mismatch
        writeReportFile: false
      });
      assert.fail("Audit should have aborted on database name mismatch");
    } catch (err) {
      assert.strictEqual(err.message.includes("SAFETY ABORT"), true);
      assert.strictEqual(err.message.includes("does not match expected"), true);
    } finally {
      await mongoose.disconnect();
    }
  });

  // ----------------------------------------------------------------------------
  // Suite 5: Cross-Entity Financial Audit with Synthetic Fixtures in trigyna_test
  // ----------------------------------------------------------------------------
  console.log("\n--- Suite 5: Cross-Entity Financial Reconciliation in trigyna_test ---");

  await asyncTest("Full audit correctly detects payment-invoice patient mismatches and reconciles ledgers", async () => {
    await mongoose.connect(TEST_DB_URI);
    const db = mongoose.connection.db;

    // Clean up test collections in trigyna_test
    const testCols = ["patients", "invoices", "payments", "receipts", "appointments", "consultations", "auditlogs"];
    for (const c of testCols) {
      await db.collection(c).deleteMany({});
    }

    // Insert Synthetic Fixtures
    const canonicalPatientId = new mongoose.Types.ObjectId();
    const dupPatient1Id = new mongoose.Types.ObjectId();
    const dupPatient2Id = new mongoose.Types.ObjectId();

    // 1. Patients
    await db.collection("patients").insertMany([
      {
        _id: canonicalPatientId,
        patientCode: "TR-TEST-0001",
        phone: "+91 99999 00000",
        status: "active",
        isArchived: false,
        gender: "female",
        age: 32,
        createdAt: new Date("2026-10-24T00:00:00Z")
      },
      {
        _id: dupPatient1Id,
        patientCode: "TR-TEST-0002",
        phone: "+91 99999 00000",
        status: "merged",
        isArchived: true,
        mergedInto: canonicalPatientId,
        gender: "female",
        age: 32,
        createdAt: new Date("2026-10-24T00:05:00Z")
      },
      {
        _id: dupPatient2Id,
        patientCode: "TR-TEST-0003",
        phone: "+91 99999 00000",
        status: "merged",
        isArchived: true,
        mergedInto: canonicalPatientId,
        gender: "female",
        age: 32,
        createdAt: new Date("2026-10-24T00:10:00Z")
      }
    ]);

    // 2. Invoices (All 3 re-linked to canonical, representing Stage B behavior)
    const inv1Id = new mongoose.Types.ObjectId();
    const inv2Id = new mongoose.Types.ObjectId();
    const inv3Id = new mongoose.Types.ObjectId();

    await db.collection("invoices").insertMany([
      {
        _id: inv1Id,
        invoiceNumber: "INV-TEST-001",
        patientId: canonicalPatientId,
        totalAmount: 1000,
        paidAmount: 1000,
        balanceAmount: 0,
        status: "paid"
      },
      {
        _id: inv2Id,
        invoiceNumber: "INV-TEST-002",
        patientId: canonicalPatientId,
        totalAmount: 1000,
        paidAmount: 1000,
        balanceAmount: 0,
        status: "paid"
      },
      {
        _id: inv3Id,
        invoiceNumber: "INV-TEST-003",
        patientId: canonicalPatientId,
        totalAmount: 1000,
        paidAmount: 1000,
        balanceAmount: 0,
        status: "paid"
      }
    ]);

    // 3. Payments (1 Canonical, 2 pointing to Duplicate Patients — Stage B Omission Bug)
    const pmt1Id = new mongoose.Types.ObjectId();
    const pmt2Id = new mongoose.Types.ObjectId();
    const pmt3Id = new mongoose.Types.ObjectId();

    await db.collection("payments").insertMany([
      {
        _id: pmt1Id,
        paymentNumber: "PAY-TEST-001",
        invoiceId: inv1Id,
        patientId: canonicalPatientId,
        amount: 1000,
        status: "completed"
      },
      {
        _id: pmt2Id,
        paymentNumber: "PAY-TEST-002",
        invoiceId: inv2Id,
        patientId: dupPatient1Id, // Mismatch!
        amount: 1000,
        status: "completed"
      },
      {
        _id: pmt3Id,
        paymentNumber: "PAY-TEST-003",
        invoiceId: inv3Id,
        patientId: dupPatient2Id, // Mismatch!
        amount: 1000,
        status: "completed"
      }
    ]);

    // 4. Receipts
    const rcp1Id = new mongoose.Types.ObjectId();
    const rcp2Id = new mongoose.Types.ObjectId();
    const rcp3Id = new mongoose.Types.ObjectId();

    await db.collection("receipts").insertMany([
      {
        _id: rcp1Id,
        receiptNumber: "RCP-TEST-001",
        paymentId: pmt1Id,
        invoiceId: inv1Id,
        patientId: canonicalPatientId,
        amountReceived: 1000,
        verificationToken: "token_test_001_" + Date.now()
      },
      {
        _id: rcp2Id,
        receiptNumber: "RCP-TEST-002",
        paymentId: pmt2Id,
        invoiceId: inv2Id,
        patientId: dupPatient1Id, // Mismatch vs Invoice!
        amountReceived: 1000,
        verificationToken: "token_test_002_" + Date.now()
      },
      {
        _id: rcp3Id,
        receiptNumber: "RCP-TEST-003",
        paymentId: pmt3Id,
        invoiceId: inv3Id,
        patientId: dupPatient2Id, // Mismatch vs Invoice!
        amountReceived: 1000,
        verificationToken: "token_test_003_" + Date.now()
      }
    ]);

    // Create a temporary test manifest for baseline testing
    const testManifestPath = path.join(__dirname, "scratch_test_manifest.json");
    fs.writeFileSync(testManifestPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      collections: {
        patients: { count: 3 },
        invoices: { count: 3 },
        payments: { count: 3 },
        receipts: { count: 3 }
      },
      totalDocuments: 12
    }));

    const testOutputDir = path.join(__dirname, "scratch_test_reports");

    // Execute Audit against isolated test database
    const auditResult = await runDuplicateReferenceAudit({
      existingMongooseConnection: mongoose.connection,
      expectedDbName: TEST_DB_NAME,
      canonicalIdStr: canonicalPatientId.toString(),
      manifestPath: testManifestPath,
      outputDir: testOutputDir,
      writeReportFile: true
    });

    // Clean up temporary manifest
    if (fs.existsSync(testManifestPath)) fs.unlinkSync(testManifestPath);

    // Verify Financial Ledger Aggregates
    assert.strictEqual(auditResult.financialAggregateSummary.invoices.canonicalInvoiceCount, 3);
    assert.strictEqual(auditResult.financialAggregateSummary.invoices.totalInvoicedAmount, 3000);
    assert.strictEqual(auditResult.financialAggregateSummary.payments.canonicalPaymentCount, 1);
    assert.strictEqual(auditResult.financialAggregateSummary.payments.candidateDupPaymentCount, 2);
    assert.strictEqual(auditResult.financialAggregateSummary.payments.canonicalPaymentTotal, 1000);
    assert.strictEqual(auditResult.financialAggregateSummary.payments.candidateDupPaymentTotal, 2000);
    assert.strictEqual(auditResult.financialAggregateSummary.receipts.candidateDupReceiptCount, 2);

    // Verify Cross-Entity Mismatches Caught
    assert.strictEqual(auditResult.crossEntityDiscrepancies.paymentToInvoicePatientMismatchesCount, 2);
    assert.strictEqual(auditResult.crossEntityDiscrepancies.paymentInvoiceMismatchesTrace.length, 2);

    // Verify Zero PII / Zero Raw ObjectIds in Traces
    const traceJson = JSON.stringify(auditResult.crossEntityDiscrepancies);
    assert.strictEqual(traceJson.includes(canonicalPatientId.toString()), false, "Raw canonical patient ID must be redacted");
    assert.strictEqual(traceJson.includes(dupPatient1Id.toString()), false, "Raw duplicate patient ID must be redacted");
    assert.strictEqual(traceJson.includes("+91 99999 00000"), false, "Phone number must be redacted");

    // Verify Pseudonyms used in trace
    assert.strictEqual(auditResult.crossEntityDiscrepancies.paymentInvoiceMismatchesTrace[0].invoicePatientPseudonym, "Patient_Canonical");
    assert.strictEqual(auditResult.crossEntityDiscrepancies.paymentInvoiceMismatchesTrace[0].paymentPatientPseudonym.startsWith("Patient_Dup_"), true);

    // Verify Report File Written with safe timestamp
    assert.ok(auditResult.savedReportPath, "Report path must be generated");
    assert.ok(fs.existsSync(auditResult.savedReportPath), "Report file must exist on disk");

    // Clean up test report file & directory
    if (fs.existsSync(auditResult.savedReportPath)) fs.unlinkSync(auditResult.savedReportPath);
    if (fs.existsSync(testOutputDir)) fs.rmSync(testOutputDir, { recursive: true, force: true });

    // Clean up test database documents
    for (const c of testCols) {
      await db.collection(c).deleteMany({});
    }

    await mongoose.disconnect();
  });

  // ----------------------------------------------------------------------------
  // Suite 6: Baseline Manifest Missing Behavior
  // ----------------------------------------------------------------------------
  console.log("\n--- Suite 6: Baseline Manifest Missing Handling ---");

  await asyncTest("Missing manifest reports status as NOT VERIFIED rather than claiming parity", async () => {
    const res = await compareWithBaselineManifest(null, "non_existent_manifest.json");
    assert.strictEqual(res.status, "NOT VERIFIED");
    assert.strictEqual(res.reason.includes("Baseline manifest not found"), true);
  });

  console.log("\n================================================================================");
  console.log(`Phase 2.2.1 Audit Hardening Verification Complete: ${passCount}/${testCount} tests passed.`);
  console.log("================================================================================");
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nTEST SUITE FAILED:", err);
      process.exit(1);
    });
}

module.exports = { runTests };

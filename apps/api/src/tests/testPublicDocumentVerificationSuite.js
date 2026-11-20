"use strict";

const http = require("http");
const mongoose = require("mongoose");
const crypto = require("crypto");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-trigyna-32-chars-long!!";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna_test";

const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const User = require("../modules/users/user.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");

let server;
let baseUrl;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { "Content-Type": "application/json" };
    const req = http.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        let parsed;
        try {
          parsed = JSON.parse(buffer.toString("utf8"));
        } catch (e) {
          parsed = buffer.toString("utf8");
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runPublicVerificationTests() {
  console.log("================================================================================");
  console.log("   TRIGYNA PUBLIC DOCUMENT VERIFICATION & SECURITY TEST SUITE");
  console.log("================================================================================");

  await connectDB();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[HTTP] Test server listening on ${baseUrl}`);

  try {
    // 1. Prepare Fixture Entities
    const patientUser = await User.create({
      name: "Radhika Kulkarni",
      email: `radhika_${Date.now()}@test.com`,
      phone: "+919876543210",
      passwordHash: "HashedPassword123!",
      role: "patient",
      status: "active",
    });

    const patient = await Patient.create({
      userId: patientUser._id,
      patientCode: `PAT-${Date.now().toString().slice(-4)}`,
      fullName: "Radhika Kulkarni",
      phone: "+919876543210",
      email: patientUser.email,
      gender: "female",
      dateOfBirth: new Date("1994-05-12"),
      address: "123 FC Road, Pune, Maharashtra 411004",
      medicalHistory: "PCOS diagnosed in 2021",
    });

    const docUser = await User.create({
      name: "Dr. Harshali Sutar",
      email: `harshali_${Date.now()}@test.com`,
      phone: "+919876500000",
      passwordHash: "HashedPassword123!",
      role: "doctor",
      status: "active",
    });

    const doctor = await Doctor.create({
      userId: docUser._id,
      name: "Dr. Harshali Sutar",
      email: docUser.email,
      phone: "+919876500000",
      specialization: ["Gynecology", "PCOS Care"],
      qualifications: "MBBS, DGO, DNB",
      status: "active",
    });

    // 2. Create Unpaid Pending Invoice
    const unpaidInvoice = await Invoice.create({
      invoiceNumber: `INV-TEST-PENDING-${Date.now().toString().slice(-4)}`,
      patientId: patient._id,
      doctorId: doctor._id,
      totalAmount: 2500,
      paidAmount: 0,
      balanceAmount: 2500,
      status: "pending",
      items: [{ description: "PCOS Consultation", quantity: 1, unitPrice: 2500, amount: 2500 }],
    });

    // 3. Create Fully Paid Invoice + Payment + Receipt
    const paidInvoice = await Invoice.create({
      invoiceNumber: `INV-TEST-PAID-${Date.now().toString().slice(-4)}`,
      patientId: patient._id,
      doctorId: doctor._id,
      totalAmount: 1500,
      paidAmount: 1500,
      balanceAmount: 0,
      status: "paid",
      items: [{ description: "Routine Health Checkup", quantity: 1, unitPrice: 1500, amount: 1500 }],
    });

    const payment = await Payment.create({
      paymentNumber: `PAY-TEST-${Date.now().toString().slice(-4)}`,
      invoiceId: paidInvoice._id,
      patientId: patient._id,
      amount: 1500,
      currency: "INR",
      paymentMethod: "upi",
      status: "success",
      paidAt: new Date(),
    });

    const verificationToken = crypto.randomBytes(16).toString("hex");
    const receipt = await Receipt.create({
      receiptNumber: `RCP/2026/TEST-${Date.now().toString().slice(-4)}`,
      paymentId: payment._id,
      invoiceId: paidInvoice._id,
      patientId: patient._id,
      doctorId: doctor._id,
      amountReceived: 1500,
      currency: "INR",
      paymentMethod: "UPI",
      issuedAt: new Date(),
      verificationToken,
      status: "issued",
      items: [{ description: "Routine Health Checkup", quantity: 1, unitPrice: 1500, amount: 1500 }],
    });

    // 4. Create Cancelled Invoice
    const cancelledInvoice = await Invoice.create({
      invoiceNumber: `INV-TEST-CANCELLED-${Date.now().toString().slice(-4)}`,
      patientId: patient._id,
      doctorId: doctor._id,
      totalAmount: 3000,
      paidAmount: 0,
      balanceAmount: 3000,
      status: "cancelled",
      items: [{ description: "Cancelled Consultation", quantity: 1, unitPrice: 3000, amount: 3000 }],
    });

    // 5. Create Refunded Receipt (linked to its own refunded payment)
    const refundedPayment = await Payment.create({
      paymentNumber: `PAY-REFUND-${Date.now().toString().slice(-4)}`,
      invoiceId: paidInvoice._id,
      patientId: patient._id,
      amount: 1500,
      currency: "INR",
      paymentMethod: "upi",
      status: "refunded",
      paidAt: new Date(),
    });

    const refundedReceipt = await Receipt.create({
      receiptNumber: `RCP/2026/REFUNDED-${Date.now().toString().slice(-4)}`,
      paymentId: refundedPayment._id,
      invoiceId: paidInvoice._id,
      patientId: patient._id,
      doctorId: doctor._id,
      amountReceived: 1500,
      currency: "INR",
      paymentMethod: "UPI",
      issuedAt: new Date(),
      verificationToken: crypto.randomBytes(16).toString("hex"),
      status: "refunded",
      items: [{ description: "Routine Health Checkup", quantity: 1, unitPrice: 1500, amount: 1500 }],
    });

    console.log("[SETUP] Verification test fixtures prepared successfully.");

    // TEST 1: Receipt verification by verificationToken
    console.log("\n[TEST 1] Verifying receipt by cryptographic token...");
    const res1 = await makeRequest("GET", `/api/v1/public/document-verification/${receipt.verificationToken}`);
    assert(res1.status === 200, `Expected 200, got ${res1.status}`);
    assert(res1.body.data.verified === true, "Expected verified === true");
    assert(res1.body.data.outcome === "fully_paid", `Expected outcome 'fully_paid', got '${res1.body.data.outcome}'`);
    assert(res1.body.data.documentNumber === receipt.receiptNumber, "Document number mismatch");
    assert(res1.body.data.amountPaid === 1500, "Amount paid mismatch");
    console.log("✓ TEST 1 PASSED: Valid receipt verified by cryptographic token.");

    // TEST 2: Receipt verification by receiptNumber
    console.log("\n[TEST 2] Verifying receipt by document number (RCP/2026/...)...");
    const res2 = await makeRequest("GET", `/api/v1/public/document-verification/${encodeURIComponent(receipt.receiptNumber)}`);
    assert(res2.status === 200, `Expected 200, got ${res2.status}`);
    assert(res2.body.data.verified === true, "Expected verified === true");
    assert(res2.body.data.documentType === "receipt", "Document type must be receipt");
    console.log("✓ TEST 2 PASSED: Valid receipt verified by human-readable document number.");

    // TEST 3: Invoice verification (unpaid) -> outcome: payment_pending
    console.log("\n[TEST 3] Verifying unpaid invoice by invoiceNumber...");
    const res3 = await makeRequest("GET", `/api/v1/public/document-verification/${unpaidInvoice.invoiceNumber}`);
    assert(res3.status === 200, `Expected 200, got ${res3.status}`);
    assert(res3.body.data.verified === true, "Expected verified === true");
    assert(res3.body.data.outcome === "payment_pending", `Expected outcome 'payment_pending', got '${res3.body.data.outcome}'`);
    assert(res3.body.data.documentType === "invoice", "Document type must be invoice");
    assert(res3.body.data.balanceAmount === 2500, "Balance amount must equal 2500");
    console.log("✓ TEST 3 PASSED: Unpaid invoice verified with outcome 'payment_pending'.");

    // TEST 4: Invoice verification (paid) -> outcome: fully_paid
    console.log("\n[TEST 4] Verifying paid invoice by invoiceNumber...");
    const res4 = await makeRequest("GET", `/api/v1/public/document-verification/${paidInvoice.invoiceNumber}`);
    assert(res4.status === 200, `Expected 200, got ${res4.status}`);
    assert(res4.body.data.verified === true, "Expected verified === true");
    assert(res4.body.data.outcome === "fully_paid", `Expected outcome 'fully_paid', got '${res4.body.data.outcome}'`);
    console.log("✓ TEST 4 PASSED: Paid invoice verified with outcome 'fully_paid'.");

    // TEST 5: Cancelled invoice verification -> outcome: cancelled, verified: false
    console.log("\n[TEST 5] Verifying cancelled invoice...");
    const res5 = await makeRequest("GET", `/api/v1/public/document-verification/${cancelledInvoice.invoiceNumber}`);
    assert(res5.status === 200, `Expected 200, got ${res5.status}`);
    assert(res5.body.data.verified === false, "Cancelled document must have verified === false");
    assert(res5.body.data.outcome === "cancelled", `Expected outcome 'cancelled', got '${res5.body.data.outcome}'`);
    console.log("✓ TEST 5 PASSED: Cancelled document properly flagged.");

    // TEST 6: Refunded receipt verification -> outcome: refunded
    console.log("\n[TEST 6] Verifying refunded receipt...");
    const res6 = await makeRequest("GET", `/api/v1/public/document-verification/${refundedReceipt.verificationToken}`);
    assert(res6.status === 200, `Expected 200, got ${res6.status}`);
    assert(res6.body.data.outcome === "refunded", `Expected outcome 'refunded', got '${res6.body.data.outcome}'`);
    console.log("✓ TEST 6 PASSED: Refunded receipt properly flagged.");

    // TEST 7: Unknown reference verification -> outcome: not_found
    console.log("\n[TEST 7] Verifying unknown/nonexistent reference...");
    const res7 = await makeRequest("GET", "/api/v1/public/document-verification/NON_EXISTENT_REF_9999");
    assert(res7.status === 200, `Expected 200, got ${res7.status}`);
    assert(res7.body.data.verified === false, "Unknown reference must have verified === false");
    assert(res7.body.data.outcome === "not_found", `Expected outcome 'not_found', got '${res7.body.data.outcome}'`);
    console.log("✓ TEST 7 PASSED: Non-existent reference returns clean not_found outcome.");

    // TEST 8: Strict Security & Privacy Audit (No PHI or sensitive leak)
    console.log("\n[TEST 8] Auditing response payload for zero PHI / PII leaks...");
    const rawResponseBody = JSON.stringify(res1.body);
    const forbiddenKeywords = [
      "+919876543210",
      "9876543210",
      "radhika",
      "@test.com",
      "123 FC Road",
      "411004",
      "1994-05-12",
      "PCOS diagnosed in 2021",
      patient._id.toString(),
      patientUser._id.toString(),
    ];

    for (const keyword of forbiddenKeywords) {
      assert(
        !rawResponseBody.toLowerCase().includes(keyword.toLowerCase()),
        `Security violation: Sensitive keyword '${keyword}' detected in public response payload!`
      );
    }
    // Also verify patient masking format (e.g. "R***** K*****")
    assert(res1.body.data.maskedPatient.includes("*"), "Patient name must be masked");
    console.log(`  -> Masked Patient Output: "${res1.body.data.maskedPatient}"`);
    console.log("✓ TEST 8 PASSED: Zero PHI / PII leak confirmed; strict DTO allowlist enforced.");

    // TEST 9: Backward compatibility route /receipts/verify/:token
    console.log("\n[TEST 9] Verifying backward-compatible route /api/v1/receipts/verify/:token...");
    const res9 = await makeRequest("GET", `/api/v1/receipts/verify/${receipt.verificationToken}`);
    assert(res9.status === 200, `Expected 200, got ${res9.status}`);
    assert(res9.body.data.verified === true, "Expected verified === true on /receipts/verify/:token");
    console.log("✓ TEST 9 PASSED: Backward compatibility with QR code scanner route confirmed.");

    console.log("\n================================================================================");
    console.log("   🎉 ALL 9 PUBLIC DOCUMENT VERIFICATION TESTS PASSED (100% SUCCESS)!");
    console.log("================================================================================");
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await disconnectDB();
  }
}

runPublicVerificationTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});

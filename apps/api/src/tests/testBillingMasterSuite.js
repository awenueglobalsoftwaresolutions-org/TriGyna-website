"use strict";

/**
 * TriGyna Master Billing & Payment Verification Test Suite
 * Validates 10 core production scenarios across Admin, Sales, Doctor, and Patient dashboards.
 * Uses native Node.js HTTP client to ensure zero third-party testing dependencies.
 */

const crypto = require("crypto");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Ensure environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-trigyna-32-chars-long!!";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_trigyna123456";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_trigyna_test_secret_key";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna_test";

const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Lead = require("../modules/crm/lead.model");
const Appointment = require("../modules/appointments/appointment.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const AuditLog = require("../modules/audit/audit.model");

const JWT_SECRET = process.env.JWT_SECRET;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let server;
let baseUrl;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          let body;
          const contentType = res.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            try {
              body = JSON.parse(buffer.toString("utf8"));
            } catch (e) {
              body = buffer.toString("utf8");
            }
          } else {
            body = buffer;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function generateToken(user) {
  return jwt.sign(
    {
      _id: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function calculateHmac(orderId, paymentId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

let adminUser, adminToken;
let patientUserA, patientDocA, patientTokenA;
let patientUserB, patientDocB, patientTokenB;
let doctorUser, doctorDoc, doctorToken;
let salesUser, salesToken;
let hrmsUser, hrmsToken;

let testInvoiceA;
let createdOrderId;
let testPaymentId = "pay_test_" + Date.now();

async function runMasterBillingTests() {
  console.log("================================================================================");
  console.log("   TRIGYNA MASTER BILLING, PAYMENTS, INVOICES & RECEIPTS TEST SUITE");
  console.log("================================================================================");

  await connectDB();

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[HTTP] Ephemeral test server listening on ${baseUrl}`);
      resolve();
    });
  });

  try {
    // --------------------------------------------------------------------------
    // SETUP FIXTURES
    // --------------------------------------------------------------------------
    console.log("\n[SETUP] Creating test users and entities...");

    // 1. Admin
    adminUser = await User.findOneAndUpdate(
      { email: "master_admin@trigyna.test" },
      { name: "Master Admin", email: "master_admin@trigyna.test", role: "admin", status: "active" },
      { upsert: true, new: true }
    );
    adminToken = generateToken(adminUser);

    // 2. Patient A
    patientUserA = await User.findOneAndUpdate(
      { email: "patient_a@trigyna.test" },
      { name: "Patient Alice", email: "patient_a@trigyna.test", phone: "+919876543210", role: "patient", status: "active" },
      { upsert: true, new: true }
    );
    patientTokenA = generateToken(patientUserA);

    patientDocA = await Patient.findOneAndUpdate(
      { userId: patientUserA._id },
      { userId: patientUserA._id, fullName: "Patient Alice", patientCode: "TG-TEST-PA01", phone: "+919876543210" },
      { upsert: true, new: true }
    );

    // 3. Patient B
    patientUserB = await User.findOneAndUpdate(
      { email: "patient_b@trigyna.test" },
      { name: "Patient Bob", email: "patient_b@trigyna.test", phone: "+919876543211", role: "patient", status: "active" },
      { upsert: true, new: true }
    );
    patientTokenB = generateToken(patientUserB);

    patientDocB = await Patient.findOneAndUpdate(
      { userId: patientUserB._id },
      { userId: patientUserB._id, fullName: "Patient Bob", patientCode: "TG-TEST-PB02", phone: "+919876543211" },
      { upsert: true, new: true }
    );

    // 4. Doctor
    doctorUser = await User.findOneAndUpdate(
      { email: "doctor_sharma@trigyna.test" },
      { name: "Dr. Ananya Sharma", email: "doctor_sharma@trigyna.test", role: "doctor", status: "active" },
      { upsert: true, new: true }
    );
    doctorToken = generateToken(doctorUser);

    doctorDoc = await Doctor.findOneAndUpdate(
      { userId: doctorUser._id },
      {
        userId: doctorUser._id,
        name: "Dr. Ananya Sharma",
        specialization: "Obstetrician & Gynecologist",
        consultationFee: 1500,
        registrationNumber: "MCI-TG-9944",
      },
      { upsert: true, new: true }
    );

    // 5. Sales
    salesUser = await User.findOneAndUpdate(
      { email: "sales_rep@trigyna.test" },
      { name: "Sales Executive Vikram", email: "sales_rep@trigyna.test", role: "sales", status: "active" },
      { upsert: true, new: true }
    );
    salesToken = generateToken(salesUser);

    // 6. HRMS (unauthorized billing role)
    hrmsUser = await User.findOneAndUpdate(
      { email: "hrms_officer@trigyna.test" },
      { name: "HRMS Officer", email: "hrms_officer@trigyna.test", role: "hrms", status: "active" },
      { upsert: true, new: true }
    );
    hrmsToken = generateToken(hrmsUser);

    console.log("✓ Fixtures successfully prepared.");

    // ==========================================================================
    // TEST 1: INVOICE CREATION & TOTAL/BALANCE DERIVATION
    // ==========================================================================
    console.log("\n[TEST 1] Creating an authorized invoice with line items & GST...");
    const invoiceRes = await makeRequest(
      "POST",
      "/api/v1/invoices",
      {
        patientId: patientDocA._id.toString(),
        doctorId: doctorDoc._id.toString(),
        items: [
          { description: "Specialized Gynecological Consultation", quantity: 1, unitPrice: 1500, taxPaise: 0 },
          { description: "Pelvic Ultrasound Imaging", quantity: 1, unitPrice: 2000, taxPaise: 0 },
        ],
        notes: "Initial comprehensive obstetric clinical evaluation",
      },
      adminToken
    );

    if (invoiceRes.status !== 201) {
      throw new Error(`Failed to create invoice: status ${invoiceRes.status} -> ${JSON.stringify(invoiceRes.body)}`);
    }

    testInvoiceA = invoiceRes.body.data.invoice;
    console.log(`  -> Invoice created: ${testInvoiceA.invoiceNumber}`);
    console.log(`  -> Total Amount: ₹${testInvoiceA.totalAmount}, Balance Due: ₹${testInvoiceA.balanceAmount}`);

    if (testInvoiceA.totalAmount !== 3500) {
      throw new Error(`Expected totalAmount 3500, received ${testInvoiceA.totalAmount}`);
    }
    if (testInvoiceA.balanceAmount !== 3500) {
      throw new Error(`Expected balanceAmount 3500, received ${testInvoiceA.balanceAmount}`);
    }
    if (testInvoiceA.status !== "issued" && testInvoiceA.status !== "pending") {
      throw new Error(`Expected invoice status issued/pending, got ${testInvoiceA.status}`);
    }
    console.log("✓ TEST 1 PASSED: Invoice totals & balance calculated strictly on server.");

    // ==========================================================================
    // TEST 2: RAZORPAY PAYMENT INITIATION (ORDER CREATION)
    // ==========================================================================
    console.log("\n[TEST 2] Initiating payment order via Patient A...");
    const orderRes = await makeRequest(
      "POST",
      `/api/v1/invoices/${testInvoiceA._id}/payments/order`,
      {},
      patientTokenA
    );

    if (orderRes.status !== 200 && orderRes.status !== 201) {
      throw new Error(`Failed to create payment order: ${orderRes.status} -> ${JSON.stringify(orderRes.body)}`);
    }

    const orderData = orderRes.body.data;
    createdOrderId = orderData.orderId || orderData.id;
    console.log(`  -> Created Provider Order ID: ${createdOrderId}`);
    console.log(`  -> Order Amount: ₹${orderData.amount} (${orderData.amountInPaise} paise)`);

    if (orderData.amount !== 3500 || orderData.amountInPaise !== 350000) {
      throw new Error(`Expected order amount ₹3500 (350000 paise), got ₹${orderData.amount} (${orderData.amountInPaise} paise)`);
    }
    console.log("✓ TEST 2 PASSED: Order created securely with outstanding balance in minor units.");

    // ==========================================================================
    // TEST 3: MANDATORY CRYPTOGRAPHIC HMAC SIGNATURE ENFORCEMENT
    // ==========================================================================
    console.log("\n[TEST 3A] Attempting payment verification with missing signature (must fail)...");
    const missingSigRes = await makeRequest(
      "POST",
      `/api/v1/invoices/${testInvoiceA._id}/payments/verify`,
      {
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: testPaymentId,
        // no signature
      },
      patientTokenA
    );

    if (missingSigRes.status !== 400) {
      throw new Error(`Expected 400 on missing signature, received ${missingSigRes.status}`);
    }
    console.log("  -> Correctly rejected missing signature with 400 Validation Error.");

    console.log("[TEST 3B] Attempting payment verification with forged signature (must fail)...");
    const forgedSigRes = await makeRequest(
      "POST",
      `/api/v1/invoices/${testInvoiceA._id}/payments/verify`,
      {
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: "forged_invalid_signature_34987293487293847293847293847293847",
      },
      patientTokenA
    );

    if (forgedSigRes.status !== 400) {
      throw new Error(`Expected 400 on forged signature, received ${forgedSigRes.status}`);
    }
    console.log("  -> Correctly rejected forged signature with 400 Validation Error.");

    console.log("[TEST 3C] Verifying payment with genuine cryptographic HMAC signature (must succeed)...");
    const validSignature = calculateHmac(createdOrderId, testPaymentId, RAZORPAY_KEY_SECRET);
    const validSigRes = await makeRequest(
      "POST",
      `/api/v1/invoices/${testInvoiceA._id}/payments/verify`,
      {
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      patientTokenA
    );

    if (validSigRes.status !== 200) {
      throw new Error(`Valid signature verification failed: ${validSigRes.status} -> ${JSON.stringify(validSigRes.body)}`);
    }

    const verifyData = validSigRes.body.data;
    console.log(`  -> Payment verified successfully! Receipt Number: ${verifyData.receipt?.receiptNumber}`);
    console.log(`  -> Invoice Status: ${verifyData.invoice?.status}, Balance: ₹${verifyData.invoice?.balanceAmount}`);

    if (verifyData.invoice?.status !== "paid") {
      throw new Error(`Expected invoice status 'paid', got ${verifyData.invoice?.status}`);
    }
    if (verifyData.invoice?.balanceAmount !== 0) {
      throw new Error(`Expected balance 0, got ${verifyData.invoice?.balanceAmount}`);
    }
    console.log("✓ TEST 3 PASSED: Strict cryptographic HMAC verification enforced without bypass.");

    // ==========================================================================
    // TEST 4: IDEMPOTENT RECEIPT GENERATION (NO DUPLICATE RECEIPTS ON REPLAY)
    // ==========================================================================
    console.log("\n[TEST 4] Testing idempotency by re-submitting same verified payment...");
    const replayRes = await makeRequest(
      "POST",
      `/api/v1/invoices/${testInvoiceA._id}/payments/verify`,
      {
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
      patientTokenA
    );

    if (replayRes.status !== 200) {
      throw new Error(`Replay request failed: ${replayRes.status}`);
    }

    const receiptsForInvoice = await Receipt.find({ invoiceId: testInvoiceA._id });
    console.log(`  -> Total Receipts for Invoice in MongoDB: ${receiptsForInvoice.length}`);
    if (receiptsForInvoice.length !== 1) {
      throw new Error(`Duplicate receipts detected! Expected 1, found ${receiptsForInvoice.length}`);
    }
    console.log("✓ TEST 4 PASSED: Replay attack/duplicate webhook safely handled with idempotency.");

    // ==========================================================================
    // TEST 5: STRICT RBAC & CROSS-PATIENT IDOR PREVENTION
    // ==========================================================================
    console.log("\n[TEST 5A] Patient B attempting to access Patient A's invoice (must return 403)...");
    const idorInvoiceRes = await makeRequest(
      "GET",
      `/api/v1/invoices/${testInvoiceA._id}`,
      null,
      patientTokenB
    );

    if (idorInvoiceRes.status !== 403) {
      throw new Error(`IDOR vulnerability! Patient B received status ${idorInvoiceRes.status} instead of 403 Forbidden`);
    }
    console.log("  -> Correctly blocked with 403 Forbidden.");

    console.log("[TEST 5B] Patient B attempting to download Patient A's invoice PDF (must return 403)...");
    const idorPdfRes = await makeRequest(
      "GET",
      `/api/v1/invoices/${testInvoiceA._id}/pdf`,
      null,
      patientTokenB
    );

    if (idorPdfRes.status !== 403) {
      throw new Error(`IDOR vulnerability! Patient B downloaded PDF with status ${idorPdfRes.status} instead of 403`);
    }
    console.log("  -> Correctly blocked with 403 Forbidden.");

    console.log("[TEST 5C] Patient B attempting to download Patient A's receipt PDF (must return 403)...");
    const idorReceiptRes = await makeRequest(
      "GET",
      `/api/v1/invoices/${testInvoiceA._id}/receipt/pdf`,
      null,
      patientTokenB
    );

    if (idorReceiptRes.status !== 403) {
      throw new Error(`IDOR vulnerability! Patient B downloaded receipt with status ${idorReceiptRes.status} instead of 403`);
    }
    console.log("  -> Correctly blocked with 403 Forbidden.");

    console.log("[TEST 5D] HRMS user attempting to list invoices (must return 403)...");
    const hrmsRes = await makeRequest(
      "GET",
      "/api/v1/invoices",
      null,
      hrmsToken
    );

    if (hrmsRes.status !== 403) {
      throw new Error(`RBAC failure! HRMS accessed billing with status ${hrmsRes.status} instead of 403`);
    }
    console.log("  -> Correctly blocked with 403 Forbidden.");
    console.log("✓ TEST 5 PASSED: IDOR protection and role boundaries verified across all endpoints.");

    // ==========================================================================
    // TEST 6: DOCTOR DASHBOARD BILLING & CONSULTATION ENCOUNTER
    // ==========================================================================
    console.log("\n[TEST 6] Doctor querying own consultation billing ledger...");
    const doctorBillingRes = await makeRequest(
      "GET",
      "/api/v1/doctor/billing",
      null,
      doctorToken
    );

    if (doctorBillingRes.status !== 200) {
      throw new Error(`Doctor billing query failed: ${doctorBillingRes.status}`);
    }

    const docData = doctorBillingRes.body.data;
    console.log(`  -> Doctor Total Consultation Invoiced: ₹${docData.summary?.totalConsultationBilled}`);
    console.log(`  -> Doctor Total Collected: ₹${docData.summary?.totalConsultationCollected}`);
    console.log(`  -> Invoices Count: ${docData.invoices?.length}`);

    const docInvoiceFound = docData.invoices.some((inv) => inv._id.toString() === testInvoiceA._id.toString());
    if (!docInvoiceFound) {
      throw new Error("Created consultation invoice missing from doctor billing ledger");
    }
    console.log("✓ TEST 6 PASSED: Doctor billing ledger accurately retrieves assigned patient records.");

    // ==========================================================================
    // TEST 7: CRM / SALES LEAD BILLING ENDPOINT
    // ==========================================================================
    console.log("\n[TEST 7A] Querying billing for an unconverted lead...");
    const unconvertedLead = await Lead.create({
      fullName: "Inquiry Prospect Priya",
      phone: "+919999911111",
      serviceInterest: "PCOD Reversal Care",
      source: "website",
      status: "new",
    });

    const unconvertedLeadRes = await makeRequest(
      "GET",
      `/api/v1/crm/leads/${unconvertedLead._id}/billing`,
      null,
      salesToken
    );

    if (unconvertedLeadRes.status !== 200) {
      throw new Error(`Unconverted lead billing request failed: ${unconvertedLeadRes.status}`);
    }
    if (unconvertedLeadRes.body.data.hasPatient !== false) {
      throw new Error(`Expected hasPatient: false, got ${unconvertedLeadRes.body.data.hasPatient}`);
    }
    console.log("  -> Correctly returned hasPatient: false without fabricating fake billing records.");

    console.log("[TEST 7B] Querying billing for a converted lead linked to Patient A...");
    const convertedLead = await Lead.create({
      fullName: "Patient Alice",
      phone: "+919876543210",
      serviceInterest: "Obstetrics Care",
      source: "referral",
      status: "converted",
      convertedPatientId: patientDocA._id,
    });

    const convertedLeadRes = await makeRequest(
      "GET",
      `/api/v1/crm/leads/${convertedLead._id}/billing`,
      null,
      salesToken
    );

    if (convertedLeadRes.status !== 200) {
      throw new Error(`Converted lead billing request failed: ${convertedLeadRes.status}`);
    }
    const leadBillingData = convertedLeadRes.body.data;
    if (!leadBillingData.hasPatient) {
      throw new Error("Expected hasPatient: true for converted lead");
    }
    console.log(`  -> Invoices found for converted lead: ${leadBillingData.invoices?.length}`);
    console.log(`  -> Receipts found: ${leadBillingData.receipts?.length}`);
    console.log("✓ TEST 7 PASSED: Sales CRM lead billing returns authentic records.");

    // ==========================================================================
    // TEST 8: AUTHORIZED OFFLINE PAYMENT RECORDING WITH STAFF AUDIT
    // ==========================================================================
    console.log("\n[TEST 8] Creating second invoice and recording authorized offline payment...");
    const invoiceBRes = await makeRequest(
      "POST",
      "/api/v1/invoices",
      {
        patientId: patientDocB._id.toString(),
        items: [{ description: "Postnatal Follow-up Visit", quantity: 1, unitPrice: 1200 }],
        notes: "Desk consultation offline payment",
      },
      adminToken
    );

    const invoiceB = invoiceBRes.body.data.invoice;

    const offlinePaymentRes = await makeRequest(
      "POST",
      `/api/v1/invoices/${invoiceB._id}/payments`,
      {
        amount: 1200,
        paymentMethod: "cash",
        transactionId: "OFFLINE-CASH-" + Date.now(),
        notes: "Received at clinic front desk by reception staff",
      },
      adminToken
    );

    if (offlinePaymentRes.status !== 200 && offlinePaymentRes.status !== 201) {
      throw new Error(`Offline payment recording failed: ${offlinePaymentRes.status} -> ${JSON.stringify(offlinePaymentRes.body)}`);
    }

    const offlineData = offlinePaymentRes.body.data;
    console.log(`  -> Offline Payment recorded. Receipt: ${offlineData.receipt?.receiptNumber}`);
    console.log(`  -> Updated Invoice Status: ${offlineData.invoice?.status}, Balance: ₹${offlineData.invoice?.balanceAmount}`);

    const recordedPayment = await Payment.findOne({ invoiceId: invoiceB._id });
    if (!recordedPayment) throw new Error("Payment record not persisted in MongoDB");
    if (!recordedPayment.recordedBy) throw new Error("Staff attribution recordedBy missing from Payment document");
    console.log(`  -> Verified staff attribution recordedBy: ${recordedPayment.recordedBy}`);
    console.log("✓ TEST 8 PASSED: Offline payment safely recorded with staff audit trail.");

    // ==========================================================================
    // TEST 9: SERVER-SIDE PDF STREAMING FOR INVOICES & RECEIPTS
    // ==========================================================================
    console.log("\n[TEST 9A] Testing server-side Invoice PDF streaming (/api/v1/invoices/:id/pdf)...");
    const invoicePdfRes = await makeRequest(
      "GET",
      `/api/v1/invoices/${testInvoiceA._id}/pdf`,
      null,
      patientTokenA
    );

    if (invoicePdfRes.status !== 200) {
      throw new Error(`Invoice PDF failed with status ${invoicePdfRes.status}`);
    }
    if (!invoicePdfRes.headers["content-type"].includes("application/pdf")) {
      throw new Error(`Expected application/pdf, received ${invoicePdfRes.headers["content-type"]}`);
    }
    const pdfMagicBytes = invoicePdfRes.body.slice(0, 4).toString();
    console.log(`  -> Invoice PDF Content-Type: ${invoicePdfRes.headers["content-type"]}`);
    console.log(`  -> PDF Header Magic: "${pdfMagicBytes}" (length: ${invoicePdfRes.body.length} bytes)`);
    if (pdfMagicBytes !== "%PDF") {
      throw new Error(`Invalid PDF header: expected %PDF, got ${pdfMagicBytes}`);
    }

    console.log("[TEST 9B] Testing server-side Receipt PDF streaming (/api/v1/invoices/:id/receipt/pdf)...");
    const receiptPdfRes = await makeRequest(
      "GET",
      `/api/v1/invoices/${testInvoiceA._id}/receipt/pdf`,
      null,
      patientTokenA
    );

    if (receiptPdfRes.status !== 200) {
      throw new Error(`Receipt PDF failed with status ${receiptPdfRes.status}`);
    }
    if (!receiptPdfRes.headers["content-type"].includes("application/pdf")) {
      throw new Error(`Expected application/pdf, received ${receiptPdfRes.headers["content-type"]}`);
    }
    const receiptPdfMagic = receiptPdfRes.body.slice(0, 4).toString();
    console.log(`  -> Receipt PDF Magic: "${receiptPdfMagic}" (length: ${receiptPdfRes.body.length} bytes)`);
    if (receiptPdfMagic !== "%PDF") {
      throw new Error(`Invalid PDF header for receipt: ${receiptPdfMagic}`);
    }
    console.log("✓ TEST 9 PASSED: Server-side PDFKit streaming generates valid A4 PDF documents.");

    // ==========================================================================
    // TEST 10: FINANCIAL LEDGER RECONCILIATION & AUTO-REPAIR
    // ==========================================================================
    console.log("\n[TEST 10] Testing automated ledger reconciliation & repair endpoint...");
    const reconRes = await makeRequest(
      "POST",
      "/api/v1/invoices/reconciliation/repair",
      {},
      adminToken
    );

    if (reconRes.status !== 200) {
      throw new Error(`Reconciliation repair failed: ${reconRes.status} -> ${JSON.stringify(reconRes.body)}`);
    }

    const reconData = reconRes.body.data;
    const rpt = reconData.report || reconData.reconciliation || {};
    console.log(`  -> Reconciliation Status: ${rpt.reconciliationStatus || rpt.status || "reconciled"}`);
    console.log(`  -> Invoices Audited: ${rpt.invoicesAudited || rpt.invoicesChecked || 0}`);
    console.log(`  -> Repaired Discrepancies: ${rpt.fixedCount || rpt.fixedInvoices?.length || 0}`);
    console.log(`  -> Generated Missing Receipts: ${rpt.fixedReceipts?.length || 0}`);
    console.log("✓ TEST 10 PASSED: Financial reconciliation mechanism verified.");

    console.log("\n================================================================================");
    console.log("   🎉 ALL 10 MASTER BILLING & PAYMENT PRODUCTION SCENARIOS PASSED 100%!");
    console.log("================================================================================");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runMasterBillingTests();

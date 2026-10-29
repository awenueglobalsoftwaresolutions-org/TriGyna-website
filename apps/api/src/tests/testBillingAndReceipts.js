process.env.NODE_ENV = "test";
const assert = require("assert");
const http = require("http");
const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Doctor = require("../modules/doctors/doctor.model");
const Appointment = require("../modules/appointments/appointment.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
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
          let parsed;
          const contentType = res.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            try {
              parsed = JSON.parse(buffer.toString("utf8"));
            } catch (e) {
              parsed = buffer.toString("utf8");
            }
          } else {
            parsed = buffer;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
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

async function loginUser(email, password = "TriGyna@123") {
  const res = await request("POST", "/api/v1/auth/login", { identifier: email, password });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Failed to log in as ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

async function runTests() {
  console.log("==================================================");
  console.log("TriGyna Billing & Receipt System Verification Suite");
  console.log("==================================================");

  await connectDB();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TestRunner] Server listening on ${baseUrl}`);

  try {
    // 1. Authenticate tokens
    const adminToken = await loginUser("admin@trigyna.test", "TriGyna@123");
    const receptionToken = await loginUser("reception@trigyna.test", "TriGyna@123");
    const patientToken = await loginUser("patient@trigyna.test", "TriGyna@123");

    console.log("\n--- Suite 1: Reference Seed Receipt & Invoice Verification ---");
    // Verify seeded reference invoice & receipt
    const refInvoice = await Invoice.findOne({ invoiceNumber: "TRI/2026/000458" });
    assert(refInvoice, "Reference invoice TRI/2026/000458 exists");
    assert.strictEqual(refInvoice.totalAmount, 1000);
    assert.strictEqual(refInvoice.paidAmount, 1000);
    assert.strictEqual(refInvoice.status, "paid");
    console.log("  ✓ [PASS] Reference invoice TRI/2026/000458 verified");

    const refReceipt = await Receipt.findOne({ receiptNumber: "RCP/2026/000458" });
    assert(refReceipt, "Reference receipt RCP/2026/000458 exists");
    assert.strictEqual(refReceipt.amountReceived, 1000);
    assert.strictEqual(refReceipt.paymentMethod, "UPI (PhonePe)");
    console.log("  ✓ [PASS] Reference receipt RCP/2026/000458 verified");

    // Test Patient retrieval of receipt via API
    const getRecRes = await request("GET", `/api/v1/receipts/${refReceipt._id}`, null, patientToken);
    assert.strictEqual(getRecRes.status, 200);
    assert.strictEqual(getRecRes.body.data.receipt.receiptNumber, "RCP/2026/000458");
    assert(getRecRes.body.data.receipt.patientId, "Populated patient record present");
    console.log("  ✓ [PASS] GET /api/v1/receipts/:id returns populated reference receipt to patient");

    // Test Patient retrieval of receipt by invoice ID
    const getByInvRes = await request("GET", `/api/v1/receipts/by-invoice/${refInvoice._id}`, null, patientToken);
    assert.strictEqual(getByInvRes.status, 200);
    assert.strictEqual(getByInvRes.body.data.receipt.receiptNumber, "RCP/2026/000458");
    console.log("  ✓ [PASS] GET /api/v1/receipts/by-invoice/:id resolves receipt successfully");

    // Test Patient Portal listing of receipts
    const getMyRecRes = await request("GET", "/api/v1/patient/me/receipts", null, patientToken);
    assert.strictEqual(getMyRecRes.status, 200);
    assert(Array.isArray(getMyRecRes.body.data.receipts) && getMyRecRes.body.data.receipts.length > 0);
    console.log("  ✓ [PASS] GET /api/v1/patient/me/receipts lists patient receipts");

    console.log("\n--- Suite 2: Public Receipt Verification (Privacy-Safe) ---");
    // Public verification without auth token
    const verifyRes = await request("GET", `/api/v1/receipts/verify/${refReceipt.verificationToken}`);
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.data.verified, true);
    assert.strictEqual(verifyRes.body.data.receiptNumber, "RCP/2026/000458");
    assert(verifyRes.body.data.maskedPatient.includes("*"), "Patient name is masked for privacy");
    assert(!verifyRes.body.data.email, "Sensitive patient email NOT exposed in public verification");
    assert(!verifyRes.body.data.phone, "Sensitive patient phone NOT exposed in public verification");
    console.log("  ✓ [PASS] Public QR token verification authenticated receipt while protecting PHI");

    console.log("\n--- Suite 3: Bill Creation, Pricing Calculation & Auto Receipt ---");
    const testPatient = await Patient.findOne({ patientCode: "TR-1001" });
    const testDoctor = await Doctor.findOne();

    // Create a new multi-item bill
    const createBillRes = await request(
      "POST",
      "/api/v1/invoices",
      {
        patientId: testPatient._id.toString(),
        doctorId: testDoctor._id.toString(),
        prefix: "TRI",
        items: [
          {
            description: "PCOS Specialized Consultation",
            details: "30 min initial intake",
            unitPrice: 1200,
            quantity: 1,
            discountAmount: 200,
          },
          {
            description: "Nutritional Care Guide",
            unitPrice: 300,
            quantity: 1,
          },
        ],
        notes: "Automated billing test",
      },
      receptionToken
    );

    assert.strictEqual(createBillRes.status, 201);
    const newInvoice = createBillRes.body.data.invoice;
    assert(newInvoice.invoiceNumber.startsWith("TRI/"));
    // Subtotal: 1200 + 300 = 1500; Discount: 200; Total = 1300
    assert.strictEqual(newInvoice.totalAmount, 1300);
    assert.strictEqual(newInvoice.balanceAmount, 1300);
    assert.strictEqual(newInvoice.status, "pending");
    console.log(`  ✓ [PASS] Bill ${newInvoice.invoiceNumber} created with correct calculated total (₹1300)`);

    // Record partial payment
    const partialPayRes = await request(
      "POST",
      `/api/v1/invoices/${newInvoice._id}/payments`,
      {
        amount: 500,
        paymentMethod: "upi",
        paymentProvider: "phonepe",
        transactionRef: "TXN_PARTIAL_001",
        notes: "Advance installment",
      },
      receptionToken
    );
    assert.strictEqual(partialPayRes.status, 200);
    assert.strictEqual(partialPayRes.body.data.invoice.status, "partially_paid");
    assert.strictEqual(partialPayRes.body.data.invoice.balanceAmount, 800);
    assert(partialPayRes.body.data.receipt, "Receipt issued for partial payment");
    console.log("  ✓ [PASS] Partial payment (₹500) recorded, remaining balance ₹800, receipt issued");

    // Settle remaining balance
    const settlePayRes = await request(
      "POST",
      `/api/v1/invoices/${newInvoice._id}/payments`,
      {
        amount: 800,
        paymentMethod: "card",
        paymentProvider: "manual_pos",
        transactionRef: "TXN_SETTLE_002",
        idempotencyKey: "IDEMP_KEY_001",
      },
      receptionToken
    );
    assert.strictEqual(settlePayRes.status, 200);
    assert.strictEqual(settlePayRes.body.data.invoice.status, "paid");
    assert.strictEqual(settlePayRes.body.data.invoice.balanceAmount, 0);
    console.log("  ✓ [PASS] Full balance settled (₹800), invoice transitioned to 'paid'");

    // Test duplicate idempotency
    const dupePayRes = await request(
      "POST",
      `/api/v1/invoices/${newInvoice._id}/payments`,
      {
        amount: 800,
        paymentMethod: "card",
        transactionRef: "TXN_SETTLE_002",
        idempotencyKey: "IDEMP_KEY_001",
      },
      receptionToken
    );
    assert.strictEqual(dupePayRes.status, 200);
    assert.strictEqual(dupePayRes.body.data.idempotent, true);
    console.log("  ✓ [PASS] Idempotency safeguard prevented double-counting payment");

    console.log("\n--- Suite 4: Server-Side PDF Generation ---");
    const pdfRes = await request("GET", `/api/v1/receipts/${refReceipt._id}/pdf`, null, patientToken);
    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers["content-type"], "application/pdf");
    assert(pdfRes.headers["content-disposition"].includes("TriGyna-Receipt-"), "Proper PDF filename header");
    assert(Buffer.isBuffer(pdfRes.body) && pdfRes.body.length > 1000, "Valid non-empty PDF binary stream generated");
    // Check PDF magic header %PDF-
    assert.strictEqual(pdfRes.body.subarray(0, 4).toString(), "%PDF");
    console.log(`  ✓ [PASS] High-fidelity PDFKit receipt generated (${pdfRes.body.length} bytes)`);

    console.log("\n--- Suite 5: Security & Scope Isolation ---");
    // Clean up if left from previous runs
    await Patient.deleteMany({ phone: "+919999999999" });
    await Invoice.deleteMany({ invoiceNumber: "TRI/2026/009999" });
    await Payment.deleteMany({ paymentNumber: "PAY-2026-009999" });
    await Receipt.deleteMany({ receiptNumber: "RCP/2026/009999" });

    // Create another patient
    const otherPatient = await Patient.create({
      patientCode: `TG-P-${Date.now().toString().slice(-4)}`,
      fullName: "Other Patient",
      phone: "+919999999999",
      gender: "female",
      age: 30,
    });
    const otherInvoice = await Invoice.create({
      invoiceNumber: "TRI/2026/009999",
      patientId: otherPatient._id,
      items: [{ description: "Private Treatment", amount: 2000, quantity: 1 }],
      totalAmount: 2000,
      paidAmount: 2000,
      balanceAmount: 0,
      status: "paid",
    });
    const otherPayment = await Payment.create({
      paymentNumber: "PAY-2026-009999",
      invoiceId: otherInvoice._id,
      patientId: otherPatient._id,
      amount: 2000,
      paymentMethod: "card",
      status: "success",
    });
    const otherReceipt = await Receipt.create({
      receiptNumber: "RCP/2026/009999",
      paymentId: otherPayment._id,
      invoiceId: otherInvoice._id,
      patientId: otherPatient._id,
      amountReceived: 2000,
      status: "issued",
      verificationToken: "tg_rcp_other_token",
    });

    // Patient attempting to access other patient's receipt must be 403 Forbidden
    const unauthRecRes = await request("GET", `/api/v1/receipts/${otherReceipt._id}`, null, patientToken);
    assert.strictEqual(unauthRecRes.status, 403);
    console.log("  ✓ [PASS] Patient access to another patient's receipt rejected with 403 Forbidden");

    const unauthPdfRes = await request("GET", `/api/v1/receipts/${otherReceipt._id}/pdf`, null, patientToken);
    assert.strictEqual(unauthPdfRes.status, 403);
    console.log("  ✓ [PASS] Patient PDF download of another patient's receipt rejected with 403 Forbidden");

    console.log("\n==================================================");
    console.log("ALL BILLING & RECEIPT TESTS PASSED (100%)");
    console.log("==================================================");
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

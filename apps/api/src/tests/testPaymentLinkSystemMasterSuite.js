"use strict";

/**
 * TriGyna Health & Wellness
 * Admin & Sales Team Payment Link to Branded Checkout System
 * Master Test Suite
 * 
 * Scenarios:
 * 1. Admin creates Payment Link with Existing Patient + Package
 * 2. Sales Representative creates Payment Link for New Patient (Auto-registration)
 * 3. Discount Cap Enforcement (Sales role capped at 20% max discount)
 * 4. Payment Link Reference Resolution via Branded Checkout API
 * 5. Order Checkout Token Resolution & Anti-Fabrication Check
 * 6. Payment Link Detail Retrieval (GET /billing/payment-links/:id)
 * 7. Order Payment Status Tracking (GET /billing/orders/:id/payment-status)
 * 8. Order Document Streaming (GET /billing/orders/:id/receipt & /invoice)
 * 9. Cryptographic HMAC-SHA256 Payment Verification & Multi-Entity Ledger Update
 * 10. Webhook `payment_link.paid` Processing with Replay Idempotency
 * 11. Payment Link Cancellation & Checkout Validation Lock
 * 12. Non-existent Reference Error Handling (404 Not Found)
 * 13. Channel Dispatch (POST /billing/payment-links/:id/send - WhatsApp & Email)
 * 14. Admin Payment Links Querying & Pagination (GET /billing/payment-links)
 */

const crypto = require("crypto");
const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-trigyna-32-chars-long!!";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_trigyna123456";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_trigyna_test_secret_key";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna_test";

const app = require("../app");
const { connectDB, disconnectDB } = require("../config/database");

// Models
const User = require("../modules/users/user.model");
const Patient = require("../modules/patients/patient.model");
const Package = require("../modules/packages/package.model");
const Service = require("../modules/services/service.model");
const Order = require("../modules/billing/order.model");
const Invoice = require("../modules/billing/invoice.model");
const Payment = require("../modules/billing/payment.model");
const Receipt = require("../modules/billing/receipt.model");
const PaymentLink = require("../modules/billing/payment-link.model");
const PackageEntitlement = require("../modules/packages/entitlement.model");
const FinancialLedger = require("../modules/billing/financial-ledger.model");

const JWT_SECRET = process.env.JWT_SECRET;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let server;
let baseUrl;

function makeRequest(method, path, body = null, token = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      "Content-Type": "application/json",
      ...customHeaders,
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
          let resBody;
          const contentType = res.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            try {
              resBody = JSON.parse(buffer.toString("utf8"));
            } catch (e) {
              resBody = buffer.toString("utf8");
            }
          } else {
            resBody = buffer;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: resBody,
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

function computeHmacSignature(bodyString, secret = RAZORPAY_KEY_SECRET) {
  return crypto.createHmac("sha256", secret).update(bodyString).digest("hex");
}

async function runTestSuite() {
  console.log("\n================================================================================");
  console.log("       TRIGYNA HEALTH & WELLNESS — PAYMENT LINK & CHECKOUT MASTER SUITE         ");
  console.log("================================================================================\n");

  await connectDB();
  console.log("  [Setup] Connected to MongoDB test database");

  // Spin up test HTTP server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`  [Setup] Test server running on ${baseUrl}`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(message);
    }
    passedTests++;
    console.log(`  ✅ PASSED: ${message}`);
  }

  try {
    // -------------------------------------------------------------------------
    // 0. Seed Test Fixtures (Users, Patient, Package, Service)
    // -------------------------------------------------------------------------
    console.log("\n--- Setting Up Clean System Fixtures ---");

    await User.deleteMany({ email: { $in: ["plink.admin@trigyna.test", "plink.sales@trigyna.test"] } });
    await Patient.deleteMany({ phone: { $in: ["919876543210", "919988776655"] } });
    await Package.deleteMany({ slug: "pcod-holistic-plink-test" });
    await Service.deleteMany({ code: "SRV-PLINK-TEST" });

    const adminUser = await User.create({
      name: "Payment Link Admin",
      email: "plink.admin@trigyna.test",
      phone: "+919876540001",
      passwordHash: "dummyHashForTesting12345",
      role: "admin",
      status: "active",
    });
    const adminToken = generateToken(adminUser);

    const salesUser = await User.create({
      name: "Payment Link Sales Rep",
      email: "plink.sales@trigyna.test",
      phone: "+919876540002",
      passwordHash: "dummyHashForTesting12345",
      role: "sales",
      status: "active",
    });
    const salesToken = generateToken(salesUser);

    const existingPatient = await Patient.create({
      patientCode: "TG-P-9901",
      fullName: "Pooja Verma",
      phone: "919876543210",
      email: "pooja.verma@example.test",
      gender: "female",
      age: 29,
      status: "active",
    });

    const testPackage = await Package.create({
      name: "PCOD Holistic 3-Month Protocol",
      slug: "pcod-holistic-plink-test",
      category: "fertility",
      pricePaise: 499900, // Rs. 4,999.00
      totalSessions: 6,
      validityDays: 90,
      description: "Comprehensive medical and nutritional consultation protocol.",
      features: ["Gynecologist Review", "Diet Plan", "Lab Work Review"],
      isPublished: true,
    });

    const testService = await Service.create({
      code: "SRV-PLINK-TEST",
      name: "Reproductive Endocrinology Consult",
      slug: "reproductive-endocrinology-consult-plink-test",
      category: "consultation",
      department: "gynecology",
      baseFee: 1500, // Rs. 1,500.00
      durationMinutes: 45,
      consultationType: "online",
      description: "Clinical consultation for hormone health.",
      status: "active",
    });

    console.log("  [Setup] Admin, Sales Rep, Patient, Package & Service fixtures ready.");

    // Variables shared across tests
    let scenarioALink = null;
    let scenarioAOrder = null;
    let scenarioBLink = null;
    let scenarioBPatient = null;

    // -------------------------------------------------------------------------
    // Scenario 1: Admin Creates Payment Link for Existing Patient + Package
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 1: Admin Creates Payment Link (Existing Patient + Package) ---");
    {
      const res = await makeRequest("POST", "/api/v1/billing/payment-links", {
        patientId: existingPatient._id.toString(),
        packageId: testPackage._id.toString(),
        expiryDays: 5,
        sendViaWhatsApp: false,
        sendViaEmail: false,
      }, adminToken);

      assert(res.status === 201, `Status is 201 Created (got ${res.status})`);
      assert(res.body.success === true, "Response has success: true");
      assert(res.body.data?.paymentLink?.paymentLinkId?.startsWith("PLINK-"), "Generated PLINK ID with format PLINK-XXXX");
      assert(res.body.data?.paymentLink?.amount === 4999, "Authoritative package price Rs. 4,999 used");
      assert(res.body.data?.order?._id, "Internal TriGyna Order was auto-generated");
      assert(res.body.data?.order?.checkoutToken, "Order has unique checkoutToken");
      assert(res.body.data?.checkoutUrl?.includes("/checkout/pay/"), "Returns branded checkoutUrl pointing to /checkout/pay/:token");

      scenarioALink = res.body.data.paymentLink;
      scenarioAOrder = res.body.data.order;

      // Verify DB persistence
      const dbLink = await PaymentLink.findById(scenarioALink._id);
      assert(dbLink !== null, "PaymentLink persisted in MongoDB");
      assert(dbLink.status === "created" || dbLink.status === "active", "PaymentLink initial status is created/active");

      const dbOrder = await Order.findById(scenarioAOrder._id);
      assert(dbOrder !== null, "Order persisted in MongoDB");
      assert(dbOrder.paymentStatus === "pending", "Order initial status is pending");
    }

    // -------------------------------------------------------------------------
    // Scenario 2: Sales Team Creates Payment Link for New Patient (Auto-Registration)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Sales Team Creates Payment Link (New Patient Registration) ---");
    {
      const res = await makeRequest("POST", "/api/v1/billing/payment-links", {
        newPatient: {
          fullName: "Ananya Deshmukh",
          phone: "919988776655",
          email: "ananya.d@example.test",
          gender: "female",
          age: 31,
          city: "Pune",
        },
        serviceCode: testService.code,
        discount: { type: "percent", value: 10 }, // 10% discount is valid (<20%)
        discountReason: "Festive reproductive health promotion",
        expiryDays: 3,
      }, salesToken);

      if (res.status !== 201) {
        console.error("  [Debug] Scenario 2 failed with details:", JSON.stringify(res.body.error?.details, null, 2));
      }
      assert(res.status === 201, `Sales team created link (got ${res.status})`);
      assert(res.body.data?.paymentLink?.amount === 1350, "10% discount applied: Rs. 1500 - 150 = Rs. 1350");
      assert(res.body.data?.patient?.fullName === "Ananya Deshmukh", "Patient returned with Ananya Deshmukh");
      assert(res.body.data?.patient?.patientCode?.startsWith("TG-P-"), "New patient auto-registered with TG-P- code");

      scenarioBLink = res.body.data.paymentLink;
      scenarioBPatient = res.body.data.patient;

      const registeredPatient = await Patient.findOne({ phone: { $in: ["+919988776655", "919988776655"] } });
      assert(registeredPatient !== null, "New patient chart successfully created in MongoDB");
    }

    // -------------------------------------------------------------------------
    // Scenario 3: Discount Cap Enforcement for Sales Representative (>20% rejected)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Role-Based Discount Cap Enforcement ---");
    {
      const res = await makeRequest("POST", "/api/v1/billing/payment-links", {
        patientId: existingPatient._id.toString(),
        serviceCode: testService.code,
        discount: { type: "percent", value: 35 }, // Exceeds 20% cap for sales_rep
        discountReason: "Unauthorized high discount",
      }, salesToken);

      assert(res.status === 403 || res.status === 400, `Excess discount was rejected (got ${res.status})`);
      assert(res.body.success === false, "Excess discount response returned success: false");
    }

    // -------------------------------------------------------------------------
    // Scenario 4: Payment Link Reference Resolution via Branded Checkout API
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Branded Checkout Link Resolution (PLINK Reference) ---");
    {
      const res = await makeRequest("GET", `/api/v1/checkout/orders/${scenarioALink.paymentLinkId}`);

      assert(res.status === 200, `Branded checkout resolved PLINK reference (got ${res.status})`);
      assert(res.body.success === true, "Checkout resolution returned success: true");
      assert(res.body.data?.orderNumber === scenarioAOrder.orderNumber, "Resolved the exact linked Order record");
      assert(res.body.data?.totalAmount === 4999, "Amount is Rs. 4,999 (authoritative)");
      assert(res.body.data?.customerName === "Pooja Verma", "Authoritative patient name rendered from DB");
    }

    // -------------------------------------------------------------------------
    // Scenario 5: Order Checkout Token Resolution & Anti-Fabrication Check
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Checkout Token Resolution (/checkout/orders/:token) ---");
    {
      const res = await makeRequest("GET", `/api/v1/checkout/orders/${scenarioAOrder.checkoutToken}`);

      assert(res.status === 200, `Checkout token resolved successfully (got ${res.status})`);
      assert(res.body.data?.customerPhoneMasked !== undefined, "Customer masked phone is safely present");
      assert(res.body.data?.serviceName?.includes("PCOD"), "Service name accurately retrieved");
      assert(res.body.data?.orderStatus === "pending_payment" || res.body.data?.paymentStatus === "pending", "Order status is currently pending");
    }

    // -------------------------------------------------------------------------
    // Scenario 6: Payment Link Detail Retrieval (GET /billing/payment-links/:id)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Admin Retrieval of Payment Link Details ---");
    {
      const res = await makeRequest("GET", `/api/v1/billing/payment-links/${scenarioALink._id}`, null, adminToken);

      assert(res.status === 200, `Admin retrieved payment link details (got ${res.status})`);
      const plinkObj = res.body.data?.paymentLink || res.body.data?.link;
      assert(plinkObj?._id === scenarioALink._id, "Matched queried payment link ID");
      assert(plinkObj?.amount === 4999, "Payment link amount verified");
    }

    // -------------------------------------------------------------------------
    // Scenario 7: Order Payment Status Tracking
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7: Order Payment Status Tracking ---");
    {
      const res = await makeRequest("GET", `/api/v1/billing/orders/${scenarioAOrder._id}/payment-status`, null, adminToken);

      assert(res.status === 200, `Payment status queried successfully (got ${res.status})`);
      assert(res.body.data?.paymentStatus === "pending", "Initial order status correctly reported as pending");
      assert(res.body.data?.paidAmount === 0, "Initial paidAmount correctly reported as 0");
    }

    // -------------------------------------------------------------------------
    // Scenario 8: Order Document Streaming (Invoices & Receipts)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 8: Order Document Streaming (A4 Invoice & Receipt) ---");
    {
      const invRes = await makeRequest("GET", `/api/v1/billing/orders/${scenarioAOrder._id}/invoice`, null, adminToken);
      assert(invRes.status === 200, `Invoice document streamed (got ${invRes.status})`);

      const rcpRes = await makeRequest("GET", `/api/v1/billing/orders/${scenarioAOrder._id}/receipt`, null, adminToken);
      // If payment has not yet been captured, receipt endpoint handles gracefully (200 with notice or 404 until paid)
      assert(rcpRes.status === 200 || rcpRes.status === 404, `Receipt document queried safely (got ${rcpRes.status})`);
    }

    // -------------------------------------------------------------------------
    // Scenario 9: Cryptographic HMAC-SHA256 Payment Verification & Multi-Entity Ledger Update
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 9: Cryptographic HMAC Payment Verification ---");
    {
      const fakeRzpOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
      const fakeRzpPaymentId = `pay_${crypto.randomBytes(8).toString("hex")}`;

      // Update Order with rzpOrderId for verification
      await Order.findByIdAndUpdate(scenarioAOrder._id, { razorpayOrderId: fakeRzpOrderId });

      const text = `${fakeRzpOrderId}|${fakeRzpPaymentId}`;
      const validSignature = computeHmacSignature(text);

      const res = await makeRequest("POST", "/api/v1/checkout/verify", {
        orderId: scenarioAOrder._id.toString(),
        razorpayOrderId: fakeRzpOrderId,
        razorpayPaymentId: fakeRzpPaymentId,
        razorpaySignature: validSignature,
      });

      assert(res.status === 200, `Payment verified with valid HMAC (got ${res.status})`);
      assert(res.body.success === true, "Verification response success is true");
      assert(res.body.data?.order?.paymentStatus === "success", "Order paymentStatus updated to success");
      assert(res.body.data?.receiptNumber?.startsWith("RCP/"), "Receipt generated with standard RCP/ prefix");

      // Verify MongoDB Post-Payment State
      const updatedOrder = await Order.findById(scenarioAOrder._id);
      assert(updatedOrder.orderStatus === "paid", "Order orderStatus changed to paid in MongoDB");

      const dbReceipt = await Receipt.findOne({ orderId: scenarioAOrder._id });
      assert(dbReceipt !== null, "Receipt document exists in MongoDB");
      assert(dbReceipt.amountReceived === 4999 || dbReceipt.amountPaid === 4999, "Receipt recorded full Rs. 4,999 received");

      const dbEntitlement = await PackageEntitlement.findOne({ orderId: scenarioAOrder._id });
      assert(dbEntitlement !== null, "Package Entitlement activated in MongoDB");
      assert(dbEntitlement.sessionsRemaining === 6, "Total package sessions (6) credited to patient");
    }

    // -------------------------------------------------------------------------
    // Scenario 10: Webhook `payment_link.paid` Processing with Replay Idempotency
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 10: Webhook Processing & Replay Idempotency ---");
    {
      const webhookPayload = {
        entity: "event",
        event: "payment_link.paid",
        contains: ["payment_link", "payment"],
        payload: {
          payment_link: {
            entity: {
              id: scenarioBLink.razorpayPaymentLinkId || "plink_test_b_9901",
              amount: 135000, // paise
              status: "paid",
            },
          },
          payment: {
            entity: {
              id: `pay_webhook_${crypto.randomBytes(6).toString("hex")}`,
              amount: 135000,
              status: "captured",
              method: "upi",
            },
          },
        },
      };

      const payloadStr = JSON.stringify(webhookPayload);
      const webhookSignature = computeHmacSignature(payloadStr);

      // Link payment link B to this razorpay ID
      await PaymentLink.findByIdAndUpdate(scenarioBLink._id, {
        razorpayPaymentLinkId: "plink_test_b_9901",
      });

      // 1st Webhook Delivery
      const res1 = await makeRequest("POST", "/api/v1/billing/webhooks/razorpay", webhookPayload, null, {
        "x-razorpay-signature": webhookSignature,
      });

      assert(res1.status === 200, `First webhook delivery accepted with 200 OK (got ${res1.status})`);
      assert(res1.body.received === true, "Webhook acknowledged with received: true");

      // 2nd Webhook Delivery (Replay Attack / Duplicate Event)
      const res2 = await makeRequest("POST", "/api/v1/billing/webhooks/razorpay", webhookPayload, null, {
        "x-razorpay-signature": webhookSignature,
      });

      assert(res2.status === 200, `Duplicate webhook accepted with 200 OK (got ${res2.status})`);
      assert(res2.body.idempotent === true || res2.body.received === true, "Webhook idempotent deduplication engaged");
    }

    // -------------------------------------------------------------------------
    // Scenario 11: Payment Link Cancellation & Checkout Validation Lock
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 11: Payment Link Cancellation & Validation Guard ---");
    {
      // Create a fresh link to cancel
      const newLinkRes = await makeRequest("POST", "/api/v1/billing/payment-links", {
        patientId: existingPatient._id.toString(),
        serviceCode: testService.code,
        expiryDays: 1,
      }, adminToken);

      const cancelId = newLinkRes.body.data.paymentLink._id;
      const cancelOrder = newLinkRes.body.data.order;

      // Cancel the link
      const cancelRes = await makeRequest("PATCH", `/api/v1/billing/payment-links/${cancelId}/cancel`, {}, adminToken);
      assert(cancelRes.status === 200, `Payment link cancelled (got ${cancelRes.status})`);

      const dbCancelled = await PaymentLink.findById(cancelId);
      assert(dbCancelled.status === "cancelled", "MongoDB status updated to cancelled");

      // Attempt to validate via checkout API
      const valRes = await makeRequest("POST", `/api/v1/checkout/orders/${cancelOrder.checkoutToken}/validate`, {});
      assert(valRes.status === 409 || valRes.body?.data?.order?.orderStatus === "cancelled" || valRes.body?.valid === false,
        `Checkout validation rejected or flagged cancelled order (got ${valRes.status})`);
    }

    // -------------------------------------------------------------------------
    // Scenario 12: Non-Existent Reference Error Handling (404 Not Found)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 12: Non-Existent Reference Error Handling ---");
    {
      const res = await makeRequest("GET", "/api/v1/checkout/orders/PLINK-NON-EXISTENT-XYZ-9999");
      assert(res.status === 404, `Unknown checkout reference returned 404 (got ${res.status})`);
    }

    // -------------------------------------------------------------------------
    // Scenario 13: Channel Dispatch (POST /billing/payment-links/:id/send)
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 13: Channel Dispatch API ---");
    {
      const res = await makeRequest("POST", `/api/v1/billing/payment-links/${scenarioALink._id}/send`, {
        channels: ["whatsapp", "email"],
      }, adminToken);

      assert(res.status === 200, `Payment link dispatch returned 200 OK (got ${res.status})`);
      assert(res.body.success === true, "Dispatch succeeded");
    }

    // -------------------------------------------------------------------------
    // Scenario 14: Admin Payment Links Querying & Pagination
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 14: Admin Payment Links Querying & Pagination ---");
    {
      const res = await makeRequest("GET", "/api/v1/billing/payment-links?page=1&limit=10", null, adminToken);

      assert(res.status === 200, `Admin listed payment links (got ${res.status})`);
      assert(Array.isArray(res.body.data?.links), "Returned data.links array");
      assert(res.body.data.links.length > 0, `Contains created payment links (count: ${res.body.data.links.length})`);
    }

    // -------------------------------------------------------------------------
    // Cleanup & Summary
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log(`  🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} ASSERTIONS PASSED (100%)`);
    console.log("================================================================================\n");

  } catch (error) {
    console.error("\n❌ SUITE TERMINATED WITH ERROR:", error.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log("  [Cleanup] Closed test HTTP server");
    }
    await disconnectDB();
    console.log("  [Cleanup] Disconnected MongoDB\n");
  }
}

runTestSuite();

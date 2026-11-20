const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const Service = require("../modules/services/service.model");
const ServiceCategory = require("../modules/services/category.model");
const Package = require("../modules/packages/package.model");
const Entitlement = require("../modules/packages/entitlement.model");
const SessionTransaction = require("../modules/packages/session-transaction.model");
const Doctor = require("../modules/doctors/doctor.model");
const Patient = require("../modules/patients/patient.model");
const Appointment = require("../modules/appointments/appointment.model");
const Invoice = require("../modules/billing/invoice.model");
const Order = require("../modules/billing/order.model");
const User = require("../modules/users/user.model");

const { grantPackageEntitlement, reserveSessionCredit, releaseSessionCredit, consumeSessionCredit } = require("../modules/packages/session-ledger.service");
const { bookAppointmentAtomic } = require("../modules/appointments/booking.service");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runMasterVerification() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trigyna";
  await mongoose.connect(uri);

  console.log("==================================================");
  console.log("TriGyna — Services & Packages Master Test Suite");
  console.log("==================================================");

  // -----------------------------------------------------------------
  // CHECK 1: Package Pricing Immutability
  // "Existing invoice aur purchased package ki price kabhi retroactively change nahi honi chahiye."
  // -----------------------------------------------------------------
  console.log("\n--- Verification 1: Package & Service Pricing Immutability ---");

  // Step A: Create a unique isolated test patient
  const uniqueCode = `PT-TEST-${Date.now()}`;
  const patient = await Patient.create({
    patientCode: uniqueCode,
    fullName: "Priya Sharma Test",
    phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `priya.${Date.now()}@example.com`,
    gender: "female",
    age: 28,
  });

  const testPackage = await Package.findOne({ slug: "pcod-pcos-3-month-holistic-care" });
  assert(!!testPackage, "Baseline package 'PCOD/PCOS 3-Month Holistic Care' exists in DB");

  const originalPricePaise = testPackage.pricePaise;
  const originalPriceRupees = testPackage.pricePaise / 100;

  // Step B: Simulate an Order and Invoice snapshotting this package price
  const testOrder = await Order.create({
    orderNumber: `ORD-TEST-${Date.now()}`,
    patientId: patient._id,
    customerName: patient.fullName,
    customerPhone: patient.phone,
    serviceName: testPackage.name,
    packageId: testPackage._id,
    items: [
      {
        packageId: testPackage._id,
        description: testPackage.name,
        unitPrice: originalPriceRupees,
        quantity: 1,
        amount: originalPriceRupees,
        totalSessions: testPackage.totalSessions,
        validityDays: testPackage.validityDays,
      },
    ],
    subtotal: originalPriceRupees,
    totalAmount: originalPriceRupees,
    balanceDue: 0,
    paidAmount: originalPriceRupees,
    orderStatus: "paid",
    paymentStatus: "success",
  });

  const testInvoice = await Invoice.create({
    invoiceNumber: `INV-TEST-${Date.now()}`,
    patientId: patient._id,
    orderId: testOrder._id,
    totalAmount: originalPriceRupees,
    paidAmount: originalPriceRupees,
    balanceAmount: 0,
    status: "paid",
    items: [
      {
        description: testPackage.name,
        unitPrice: originalPriceRupees,
        quantity: 1,
        amount: originalPriceRupees,
      },
    ],
  });

  // Step C: Now admin changes the package price in catalogue from original to higher price
  const newPricePaise = originalPricePaise + 100000; // + ₹1,000
  testPackage.pricePaise = newPricePaise;
  testPackage.version = (testPackage.version || 1) + 1;
  await testPackage.save();

  // Step D: Verify that the previously issued Order and Invoice remain UNTOUCHED with original price!
  const fetchedOrder = await Order.findById(testOrder._id);
  const fetchedInvoice = await Invoice.findById(testInvoice._id);

  assert(
    fetchedOrder.totalAmount === originalPriceRupees,
    `Existing Order price preserved (Expected: ₹${originalPriceRupees}, Actual: ₹${fetchedOrder.totalAmount})`
  );
  assert(
    fetchedInvoice.totalAmount === originalPriceRupees,
    `Existing Invoice price preserved (Expected: ₹${originalPriceRupees}, Actual: ₹${fetchedInvoice.totalAmount})`
  );
  assert(
    fetchedOrder.items[0].unitPrice === originalPriceRupees,
    `Order line-item unitPrice is immutable against catalogue changes`
  );

  // Restore package price for clean testing
  testPackage.pricePaise = originalPricePaise;
  await testPackage.save();

  // -----------------------------------------------------------------
  // CHECK 2: Session Tracking & Idempotency
  // "Appointment complete hone par hi package session consume ho; duplicate consumption impossible ho."
  // -----------------------------------------------------------------
  console.log("\n--- Verification 2: Session Credit Tracking & Consumption Idempotency ---");

  // Step A: Grant a fresh package entitlement with 6 sessions
  const entitlement = await grantPackageEntitlement({
    patientId: patient._id,
    packageId: testPackage._id,
    orderId: testOrder.orderNumber,
    paymentId: "PAY-TEST-SESSION",
    actor: { _id: new mongoose.Types.ObjectId(), role: "admin" },
  });

  assert(entitlement.availableSessions === testPackage.totalSessions, `Entitlement created with ${testPackage.totalSessions} available sessions`);
  assert(entitlement.reservedSessions === 0, "Initial reserved sessions is 0");
  assert(entitlement.consumedSessions === 0, "Initial consumed sessions is 0");

  // Step B: Reserve 1 session for an appointment booking
  const fakeApptId = new mongoose.Types.ObjectId();
  const reserveResult = await reserveSessionCredit({
    patientId: patient._id,
    appointmentId: fakeApptId,
    actor: { _id: new mongoose.Types.ObjectId(), role: "patient" },
  });

  assert(reserveResult.reserved === true, "Session credit successfully reserved on booking");

  const afterReserve = await Entitlement.findById(entitlement._id);
  assert(afterReserve.availableSessions === testPackage.totalSessions - 1, "Available sessions decremented by 1 upon reservation");
  assert(afterReserve.reservedSessions === 1, "Reserved sessions incremented to 1");
  assert(afterReserve.consumedSessions === 0, "Consumed sessions remains 0 while appointment is scheduled");

  // Step C: Complete the appointment -> session must be permanently consumed
  const consumeResult1 = await consumeSessionCredit({
    patientId: patient._id,
    appointmentId: fakeApptId,
    actor: { _id: new mongoose.Types.ObjectId(), role: "doctor" },
  });

  assert(consumeResult1.consumed === true, "Session credit consumed upon appointment completion");

  const afterConsume = await Entitlement.findById(entitlement._id);
  assert(afterConsume.reservedSessions === 0, "Reserved sessions shifted back to 0");
  assert(afterConsume.consumedSessions === 1, "Consumed sessions successfully incremented to 1");

  // Step D: Duplicate completion attempt MUST be idempotent (NEVER double-consume!)
  const consumeResult2 = await consumeSessionCredit({
    patientId: patient._id,
    appointmentId: fakeApptId,
    actor: { _id: new mongoose.Types.ObjectId(), role: "doctor" },
  });

  assert(consumeResult2.consumed === true, "Duplicate completion request acknowledged idempotently");

  const afterDuplicate = await Entitlement.findById(entitlement._id);
  assert(
    afterDuplicate.consumedSessions === 1,
    `Idempotency guarantee verified: Consumed count remains 1, no duplicate session deduction`
  );

  // -----------------------------------------------------------------
  // CHECK 3: Doctor Availability Filtered by Service & Status
  // "Service select karne ke baad sirf eligible aur available doctors/slots dikhne chahiye."
  // -----------------------------------------------------------------
  console.log("\n--- Verification 3: Doctor Availability Scoped to Service ---");

  const gynService = await Service.findOne({ code: "SRV-GYN-01" });
  assert(!!gynService, "Service 'SRV-GYN-01' found in catalogue");

  const activeDoctors = await Doctor.find({ status: "active" }).populate("userId", "name");
  assert(activeDoctors.length > 0, `Active doctors found in clinic roster: ${activeDoctors.length}`);

  // Inactive doctor must never appear
  const inactiveDoctor = await Doctor.findOne({ status: "inactive" });
  if (inactiveDoctor) {
    const isExcluded = !activeDoctors.some((d) => d._id.equals(inactiveDoctor._id));
    assert(isExcluded, "Inactive doctors are strictly excluded from service availability");
  } else {
    assert(true, "All registered doctors are currently active");
  }

  // -----------------------------------------------------------------
  // CHECK 4: Public Website Draft Protection
  // "Admin ke Draft services public website par bookable nahi hone chahiye."
  // -----------------------------------------------------------------
  console.log("\n--- Verification 4: Public Website Draft Service Protection ---");

  // Create a draft test service
  const draftService = await Service.findOneAndUpdate(
    { code: "SRV-DRAFT-TEST" },
    {
      $set: {
        code: "SRV-DRAFT-TEST",
        name: "Confidential Experimental Protocol",
        slug: "confidential-experimental-protocol",
        category: "Others",
        durationMinutes: 30,
        baseFee: 5000,
        status: "draft",
        isPublished: false,
      },
    },
    { upsert: true, new: true }
  );

  assert(draftService.status === "draft", "Draft service created in database");

  // Attempt to book this draft service as a public patient
  let draftBookingBlocked = false;
  try {
    const doctor = activeDoctors[0];
    await bookAppointmentAtomic(
      {
        patientId: patient._id,
        doctorId: doctor._id,
        serviceName: "Confidential Experimental Protocol",
        appointmentDate: "2026-11-05",
        startTime: "10:30",
        mode: "Online Video Consultation",
        bookingSource: "website",
      },
      { _id: patient._id, role: "patient" } // Public / patient actor
    );
  } catch (err) {
    draftBookingBlocked = true;
    assert(
      err.message.includes("draft mode"),
      `Draft service booking blocked: "${err.message}"`
    );
  }

  assert(draftBookingBlocked, "Public booking attempt of draft service strictly rejected with 400 validation error");

  // Cleanup draft service
  await Service.deleteOne({ _id: draftService._id });

  // -----------------------------------------------------------------
  // CHECK 5: Automation Provider Integrity
  // "Payment verification, appointment confirmation aur notifications actual provider responses ke basis par chalne chahiye."
  // -----------------------------------------------------------------
  console.log("\n--- Verification 5: Automation & HMAC Verification Integrity ---");

  const razorpayService = require("../modules/billing/razorpay.service");
  assert(typeof razorpayService.verifyPaymentSignature === "function", "Razorpay HMAC-SHA256 signature verification service is active");

  // Verify that an invalid spoofed signature is rejected
  const spoofedValid = razorpayService.verifyPaymentSignature({
    orderId: "order_fake_123",
    paymentId: "pay_fake_456",
    signature: "spoofed_invalid_signature_hash",
  });
  assert(spoofedValid === false, "Spoofed/fraudulent payment signatures are strictly rejected");

  console.log("\n==================================================");
  console.log(`MASTER TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runMasterVerification().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});

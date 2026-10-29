const crypto = require("crypto");
const Invoice = require("./invoice.model");
const Payment = require("./payment.model");
const Receipt = require("./receipt.model");

// Safe decimal rounding helper (avoids IEEE 754 float drift)
function roundToTwo(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

const {
  generateAtomicInvoiceNumber,
  generateAtomicReceiptNumber,
} = require("../../shared/counter.service");

// Generate collision-safe invoice number using atomic sequence generator
async function generateInvoiceNumber(prefix = "TRI", session = null) {
  return generateAtomicInvoiceNumber(prefix, session);
}

// Generate collision-safe receipt number using atomic sequence generator (Format: RCP/YYYY/XXXXXX)
async function generateReceiptNumber(session = null) {
  return generateAtomicReceiptNumber(session);
}

// Calculate financial totals safely
function calculateInvoiceTotals(items = [], invoiceDiscount = 0, taxRate = 0) {
  let subtotal = 0;
  let totalLineDiscounts = 0;
  let totalLineTaxes = 0;

  const validatedItems = items.map((item, index) => {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unitPrice = roundToTwo(item.unitPrice !== undefined ? item.unitPrice : item.amount || 0);
    const lineDiscount = roundToTwo(item.discountAmount || 0);
    const lineTaxRate = item.taxRate !== undefined ? Number(item.taxRate) : taxRate;

    const baseAmount = roundToTwo(unitPrice * qty);
    const taxableLine = Math.max(0, roundToTwo(baseAmount - lineDiscount));
    const lineTax = roundToTwo(taxableLine * (lineTaxRate / 100));
    const lineTotal = roundToTwo(taxableLine + lineTax);

    subtotal = roundToTwo(subtotal + baseAmount);
    totalLineDiscounts = roundToTwo(totalLineDiscounts + lineDiscount);
    totalLineTaxes = roundToTwo(totalLineTaxes + lineTax);

    return {
      description: item.description ? item.description.trim() : `Item #${index + 1}`,
      details: item.details ? item.details.trim() : "",
      quantity: qty,
      unitPrice,
      discountAmount: lineDiscount,
      taxRate: lineTaxRate,
      taxAmount: lineTax,
      amount: lineTotal,
    };
  });

  const overallDiscount = roundToTwo(totalLineDiscounts + (Number(invoiceDiscount) || 0));
  const taxableAmount = Math.max(0, roundToTwo(subtotal - overallDiscount));
  const taxAmount = totalLineTaxes > 0 ? totalLineTaxes : roundToTwo(taxableAmount * (taxRate / 100));
  const totalAmount = roundToTwo(taxableAmount + taxAmount);

  return {
    items: validatedItems,
    subtotal,
    discountAmount: overallDiscount,
    taxableAmount,
    taxRate,
    taxAmount,
    totalAmount,
  };
}

const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const Appointment = require("../appointments/appointment.model");

// Atomic & idempotent receipt creation upon verified payment
async function createReceiptForPayment(params) {
  let payment = params.payment || params;
  let invoice = params.invoice;
  let appointmentId = params.appointmentId;
  let doctorId = params.doctorId;

  if (typeof payment === "string" || (payment && !payment.status && mongoose.Types.ObjectId.isValid(payment))) {
    payment = await Payment.findById(payment);
  }
  if (!payment) {
    throw new Error("Payment record required to generate receipt");
  }
  if (!invoice && payment.invoiceId) {
    invoice = await Invoice.findById(payment.invoiceId);
  }
  if (!invoice) {
    throw new Error("Invoice record required to generate receipt");
  }

  // 1. Guard against creating paid receipt for non-successful payments
  if (payment.status === "failed") {
    throw new Error("Cannot generate receipt for a failed payment transaction.");
  }
  if (payment.status === "pending" || payment.status === "initiated") {
    throw new Error("Cannot generate completed payment receipt for an unverified or pending transaction.");
  }

  // 2. Idempotency check: see if receipt already exists for this payment
  let receipt = await Receipt.findOne({ paymentId: payment._id });
  if (receipt) {
    return receipt;
  }

  // 3. Resolve historical patient snapshot
  let patient = invoice.patientId;
  if (!patient || !patient.fullName) {
    patient = await Patient.findById(invoice.patientId);
  }
  const patientSnapshot = patient
    ? {
        fullName: patient.fullName || "",
        patientCode: patient.patientCode || "",
        phone: patient.phone || "",
        email: patient.email || "",
      }
    : {};

  // 4. Resolve historical doctor snapshot
  const docId = doctorId || invoice.doctorId;
  let doctor = docId;
  if (docId && (!doctor || (!doctor.qualifications && !doctor.userId?.name))) {
    doctor = await Doctor.findById(docId).populate("userId", "name");
  }
  const doctorName = doctor ? (doctor.userId?.name || doctor.name || "") : "";
  const doctorSpecialization = doctor
    ? Array.isArray(doctor.specialization)
      ? doctor.specialization.join(", ")
      : doctor.specialization || ""
    : "";
  const doctorSnapshot = doctor
    ? {
        name: doctorName,
        qualifications: doctor.qualifications || "",
        specialization: doctorSpecialization,
      }
    : {};

  // 5. Resolve historical appointment snapshot
  const apptId = appointmentId || invoice.appointmentId;
  let appointment = apptId;
  if (apptId && (!appointment || !appointment.appointmentDate)) {
    appointment = await Appointment.findById(apptId);
  }
  const appointmentSnapshot = appointment
    ? {
        appointmentCode: appointment.appointmentCode || "",
        serviceName: appointment.serviceName || "",
        appointmentDate: appointment.appointmentDate || "",
        startTime: appointment.startTime || "",
        endTime: appointment.endTime || "",
        mode: appointment.mode || "",
        durationMinutes: appointment.durationMinutes || 30,
      }
    : {};

  // 6. Resolve line items snapshot and financial figures
  const itemsSnapshot = (invoice.items || []).map((it) => ({
    description: it.description,
    details: it.details || "",
    quantity: it.quantity || 1,
    unitPrice: roundToTwo(it.unitPrice !== undefined ? it.unitPrice : it.amount || 0),
    discountAmount: roundToTwo(it.discountAmount || 0),
    taxRate: Number(it.taxRate) || 0,
    taxAmount: roundToTwo(it.taxAmount || 0),
    amount: roundToTwo(it.amount),
  }));

  const subtotal = roundToTwo(invoice.subtotal || invoice.totalAmount || payment.amount);
  const discountAmount = roundToTwo(invoice.discountAmount || 0);
  const taxableAmount = roundToTwo(invoice.taxableAmount !== undefined ? invoice.taxableAmount : subtotal - discountAmount);
  const taxRate = Number(invoice.taxRate) || 0;
  const taxAmount = roundToTwo(invoice.taxAmount || 0);
  const totalAmount = roundToTwo(invoice.totalAmount || payment.amount);
  const amountPaid = roundToTwo(payment.amount);
  const balanceAmount = roundToTwo(
    invoice.balanceAmount !== undefined
      ? invoice.balanceAmount
      : Math.max(0, totalAmount - (invoice.paidAmount || amountPaid))
  );

  const financialSnapshot = {
    subtotal,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    totalAmount,
    amountPaid,
    balanceAmount,
  };

  // 7. Generate unique receipt number and cryptographic verification token
  const receiptNumber = await generateReceiptNumber();
  const verificationToken = crypto.randomBytes(16).toString("hex");

  const receiptStatus = payment.status === "refunded" ? "refunded" : "issued";

  try {
    receipt = await Receipt.create({
      receiptNumber,
      paymentId: payment._id,
      invoiceId: invoice._id,
      patientId: invoice.patientId?._id || invoice.patientId,
      appointmentId: appointment?._id || apptId,
      doctorId: doctor?._id || docId,
      amountReceived: payment.amount,
      currency: payment.currency || "INR",
      paymentMethod: payment.paymentMethod?.toUpperCase() || "UPI",
      providerTransactionId: payment.providerTransactionId || "",
      issuedAt: payment.paidAt || new Date(),
      verificationToken,
      status: receiptStatus,
      items: itemsSnapshot,
      patientSnapshot,
      doctorSnapshot,
      appointmentSnapshot,
      financialSnapshot,
      refundDetails: invoice.refundDetails || {},
    });
  } catch (err) {
    if (err.code === 11000) {
      // Concurrency race: check if receipt for this payment was created by another concurrent thread
      const existingReceipt = await Receipt.findOne({ paymentId: payment._id });
      if (existingReceipt) {
        return existingReceipt;
      }
      // If collision occurred on receiptNumber with another concurrent payment, retry with next counter
      const retryReceiptNumber = await generateReceiptNumber();
      receipt = await Receipt.create({
        receiptNumber: retryReceiptNumber,
        paymentId: payment._id,
        invoiceId: invoice._id,
        patientId: invoice.patientId?._id || invoice.patientId,
        appointmentId: appointment?._id || apptId,
        doctorId: doctor?._id || docId,
        amountReceived: payment.amount,
        currency: payment.currency || "INR",
        paymentMethod: payment.paymentMethod?.toUpperCase() || "UPI",
        providerTransactionId: payment.providerTransactionId || "",
        issuedAt: payment.paidAt || new Date(),
        verificationToken: crypto.randomBytes(16).toString("hex"),
        status: receiptStatus,
        items: itemsSnapshot,
        patientSnapshot,
        doctorSnapshot,
        appointmentSnapshot,
        financialSnapshot,
        refundDetails: invoice.refundDetails || {},
      });
    } else {
      throw err;
    }
  }

  // 8. Link back receipt to payment
  payment.receiptId = receipt._id;
  await payment.save();

  // 9. Update embedded payment entry in invoice if exists
  const invoicePayment = invoice.payments?.find(
    (p) =>
      (p.transactionRef && p.transactionRef === payment.providerTransactionId) ||
      (p.amount === payment.amount && !p.receiptId)
  );
  if (invoicePayment) {
    invoicePayment.receiptId = receipt._id;
    invoicePayment.receiptNumber = receiptNumber;
    await invoice.save();
  }

  return receipt;
}

module.exports = {
  roundToTwo,
  generateInvoiceNumber,
  generateReceiptNumber,
  calculateInvoiceTotals,
  createReceiptForPayment,
};

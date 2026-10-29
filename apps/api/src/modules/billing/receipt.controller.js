const mongoose = require("mongoose");
const Receipt = require("./receipt.model");
const Invoice = require("./invoice.model");
const Payment = require("./payment.model");
const Patient = require("../patients/patient.model");
const Organization = require("../organization/organization.model");
const { sendSuccess } = require("../../shared/response");
const { NotFoundError, ForbiddenError, ValidationError } = require("../../shared/errors");
const { generateReceiptPdf } = require("./receipt-pdf.service");
const { createReceiptForPayment } = require("./billing.service");
const { canAccessBillingDocument } = require("../auth/authorization.service");

// Helper to mask patient name for public verification (e.g. "Ananya Sharma" -> "A***** S*****")
function maskName(name) {
  if (!name) return "Valued Patient";
  return name
    .split(" ")
    .map((part) => (part.length > 1 ? part[0] + "*".repeat(Math.min(part.length - 1, 5)) : part))
    .join(" ");
}

/**
 * List receipts with RBAC
 */
async function listReceipts(req, res, next) {
  try {
    const { search, patientId, limit = 50, page = 1 } = req.query;
    const filter = {};

    // Strictly reject unauthorized roles (CRM, HRMS)
    if (["crm", "hrms"].includes(req.user.role)) {
      return next(new ForbiddenError("Access denied: You are not authorized to view financial receipts"));
    }

    if (patientId) filter.patientId = patientId;

    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return sendSuccess(res, { receipts: [], total: 0 }, "No receipts found for patient");
      }
      filter.patientId = patient._id;
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found for authenticated user"));
      }
      filter.doctorId = doctor._id;
    }

    if (search) {
      filter.receiptNumber = new RegExp(search.trim(), "i");
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [receipts, total] = await Promise.all([
      Receipt.find(filter)
        .populate("patientId", "patientCode fullName phone email")
        .populate("invoiceId", "invoiceNumber totalAmount paidAmount balanceAmount status items createdAt")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId", "appointmentCode appointmentDate startTime endTime mode serviceName")
        .populate("paymentId", "paymentNumber paymentMethod providerTransactionId paidAt status")
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Receipt.countDocuments(filter),
    ]);

    return sendSuccess(res, { receipts, total, page: parseInt(page, 10) }, "Receipts retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieve single receipt by ID with full details
 */
const Doctor = require("../doctors/doctor.model");

/**
 * Builds normalized receipt view model directly from database and historical snapshots
 * Zero hardcoded fallback names or fake emails/IDs
 */
function buildNormalizedReceipt(receipt, invoice = null, org = null) {
  // 1. Patient data: historical snapshot takes priority, then populated live record
  const patient = receipt.patientId || {};
  const patientSnap = receipt.patientSnapshot || {};
  const patientName = patientSnap.fullName || patient.fullName || "";
  const patientCode = patientSnap.patientCode || patient.patientCode || "";
  const patientPhone = patientSnap.phone || patient.phone || "";
  const patientEmail = patientSnap.email !== undefined ? patientSnap.email : (patient.email || "");

  // 2. Doctor data: historical snapshot takes priority, then populated live record
  const doctor = receipt.doctorId || {};
  const doctorSnap = receipt.doctorSnapshot || {};
  const doctorName = doctorSnap.name || doctor.userId?.name || doctor.name || "";
  const doctorQualifications = doctorSnap.qualifications || doctor.qualifications || "";
  let doctorSpecialization = doctorSnap.specialization || "";
  if (!doctorSpecialization && doctor.specialization) {
    doctorSpecialization = Array.isArray(doctor.specialization)
      ? doctor.specialization.join(", ")
      : doctor.specialization;
  }

  // 3. Appointment data: snapshot first, then populated record
  const appointment = receipt.appointmentId || {};
  const apptSnap = receipt.appointmentSnapshot || {};
  const appointmentCode = apptSnap.appointmentCode || appointment.appointmentCode || "";
  const serviceName = apptSnap.serviceName || appointment.serviceName || invoice?.items?.[0]?.description || "";
  const appointmentDate = apptSnap.appointmentDate || appointment.appointmentDate || "";
  const startTime = apptSnap.startTime || appointment.startTime || "";
  const appointmentMode = apptSnap.mode || appointment.mode || "";
  const duration = apptSnap.durationMinutes
    ? `${apptSnap.durationMinutes} Minutes`
    : appointment.durationMinutes
    ? `${appointment.durationMinutes} Minutes`
    : "";

  let appointmentDateTimeFormatted = "";
  if (appointmentDate) {
    const d = new Date(appointmentDate);
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : appointmentDate;
    appointmentDateTimeFormatted = startTime ? `${dateStr}, ${startTime}` : dateStr;
  }

  // 4. Payment details
  const payment = receipt.paymentId || {};
  let paymentMethod = "";
  if (payment.paymentMethod) {
    const pMethod = payment.paymentMethod.toUpperCase();
    const pProvider = payment.paymentProvider;
    if (pProvider && pProvider !== "manual_pos" && pProvider !== "upi") {
      paymentMethod = `${pMethod} (${pProvider})`;
    } else {
      paymentMethod = pMethod;
    }
  } else if (receipt.paymentMethod) {
    paymentMethod = receipt.paymentMethod.toUpperCase();
  } else {
    paymentMethod = "UPI";
  }

  // Maintain actual verified transaction reference without inventing fake IDs
  const providerTransactionId = payment.providerTransactionId || receipt.providerTransactionId || "";

  // 5. Line items: snapshot first, then populated invoice items
  const inv = invoice || (typeof receipt.invoiceId === "object" ? receipt.invoiceId : null);
  let items = [];
  if (receipt.items && receipt.items.length > 0) {
    items = receipt.items.map((it) => ({
      description: it.description,
      details: it.details || "",
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || it.amount || 0,
      amount: it.amount || 0,
      discountAmount: it.discountAmount || 0,
      taxRate: it.taxRate || 0,
      taxAmount: it.taxAmount || 0,
    }));
  } else if (inv?.items && inv.items.length > 0) {
    items = inv.items.map((it) => ({
      description: it.description,
      details: it.details || "",
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice !== undefined ? it.unitPrice : it.amount || 0,
      amount: it.amount || 0,
      discountAmount: it.discountAmount || 0,
      taxRate: it.taxRate || 0,
      taxAmount: it.taxAmount || 0,
    }));
  }

  // 6. Financial figures
  const finSnap = receipt.financialSnapshot || {};
  const subtotal = finSnap.subtotal !== undefined
    ? finSnap.subtotal
    : inv?.subtotal !== undefined
    ? inv.subtotal
    : receipt.amountReceived || 0;
  const discountAmount = finSnap.discountAmount !== undefined
    ? finSnap.discountAmount
    : inv?.discountAmount || 0;
  const taxRate = finSnap.taxRate !== undefined
    ? finSnap.taxRate
    : inv?.taxRate || 0;
  const taxAmount = finSnap.taxAmount !== undefined
    ? finSnap.taxAmount
    : inv?.taxAmount || 0;
  const totalAmount = finSnap.totalAmount !== undefined
    ? finSnap.totalAmount
    : inv?.totalAmount !== undefined
    ? inv.totalAmount
    : receipt.amountReceived;
  const totalPaid = receipt.amountReceived || finSnap.amountPaid || inv?.paidAmount || totalAmount;
  const balanceAmount = finSnap.balanceAmount !== undefined
    ? finSnap.balanceAmount
    : inv?.balanceAmount !== undefined
    ? inv.balanceAmount
    : Math.max(0, totalAmount - totalPaid);

  let paymentStatus = "Paid";
  if (receipt.status === "refunded" || inv?.status === "refunded" || payment.status === "refunded") {
    paymentStatus = "Refunded";
  } else if (payment.status === "pending" || payment.status === "initiated") {
    paymentStatus = "Pending";
  } else if (balanceAmount > 0) {
    paymentStatus = "Partially Paid";
  }

  return {
    _id: receipt._id,
    receiptNumber: receipt.receiptNumber,
    invoiceNumber: inv?.invoiceNumber || (typeof receipt.invoiceId === "string" ? receipt.invoiceId : ""),
    invoiceId: receipt.invoiceId,
    patientId: receipt.patientId,
    doctorId: receipt.doctorId,
    appointmentId: receipt.appointmentId,
    paymentId: receipt.paymentId,
    issuedAt: receipt.issuedAt,
    paidAt: payment.paidAt || receipt.issuedAt,
    patientName,
    patientCode,
    patientPhone,
    patientEmail,
    doctorName,
    doctorQualifications,
    doctorSpecialization,
    appointmentCode: appointmentCode || appointment._id || "",
    serviceName,
    appointmentDateTime: appointmentDateTimeFormatted,
    duration,
    appointmentMode,
    items,
    paymentMethod,
    providerTransactionId,
    paymentStatus,
    subtotal,
    discountAmount,
    taxRate,
    taxAmount,
    totalAmount,
    totalPaid,
    amountReceived: totalPaid,
    balanceAmount,
    outstandingAmount: balanceAmount,
    refundDetails: receipt.refundDetails || inv?.refundDetails || null,
    verificationToken: receipt.verificationToken,
    organization: org
      ? {
          name: org.name,
          phone: org.phone,
          email: org.email,
          website: org.website,
        }
      : null,
  };
}

async function getOrganizationData() {
  return (
    (await Organization.findOne()) || {
      name: "TriGyna Health & Wellness",
      phone: "+91 917-277-2326",
      email: "trigyna.health@gmail.com",
      website: "https://www.trigyna.com",
    }
  );
}

/**
 * Retrieve single receipt by ID with full details
 */
async function getReceiptById(req, res, next) {
  try {
    const { id } = req.params;
    let receipt = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      receipt = await Receipt.findById(id)
        .populate("patientId", "patientCode fullName phone email address age gender")
        .populate("invoiceId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId")
        .populate("paymentId");
    }

    if (!receipt) {
      receipt = await Receipt.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(id) ? [{ invoiceId: id }, { paymentId: id }] : []),
          { receiptNumber: id },
        ],
      })
        .populate("patientId", "patientCode fullName phone email address age gender")
        .populate("invoiceId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId")
        .populate("paymentId");
    }

    if (!receipt) {
      return next(new NotFoundError("Receipt not found"));
    }

    const allowed = await canAccessBillingDocument(req.user, receipt);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to view this receipt"));
    }

    const org = await getOrganizationData();
    const normalized = buildNormalizedReceipt(receipt, receipt.invoiceId, org);

    return sendSuccess(res, { receipt: normalized, rawReceipt: receipt, normalized, organization: org }, "Receipt retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieve or generate receipt for an invoice
 */
async function getReceiptByInvoiceId(req, res, next) {
  try {
    const { invoiceId } = req.params;
    let invoice = null;

    if (mongoose.Types.ObjectId.isValid(invoiceId)) {
      invoice = await Invoice.findById(invoiceId)
        .populate("patientId")
        .populate("appointmentId")
        .populate("doctorId");
    }

    if (!invoice) {
      invoice = await Invoice.findOne({ invoiceNumber: invoiceId })
        .populate("patientId")
        .populate("appointmentId")
        .populate("doctorId");
    }

    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
    }

    const allowed = await canAccessBillingDocument(req.user, invoice);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to view receipts for this invoice"));
    }

    if (invoice.status !== "paid" && invoice.status !== "partially_paid" && invoice.status !== "refunded") {
      return next(new ValidationError("Receipt is only available for paid, partially paid, or refunded invoices with confirmed payment."));
    }

    let receipt = await Receipt.findOne({ invoiceId: invoice._id })
      .populate("patientId")
      .populate("appointmentId")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("paymentId");

    // Auto-create receipt if invoice is paid but receipt wasn't generated yet (e.g. legacy invoices)
    if (!receipt) {
      let payment = await Payment.findOne({ invoiceId: invoice._id, status: "success" });
      if (!payment) {
        payment = await Payment.create({
          paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
          invoiceId: invoice._id,
          patientId: invoice.patientId._id || invoice.patientId,
          amount: invoice.paidAmount || invoice.totalAmount,
          currency: invoice.currency || "INR",
          paymentMethod: invoice.paymentMethod !== "none" ? invoice.paymentMethod : "upi",
          paymentProvider: "manual_pos",
          providerTransactionId: undefined,
          status: "success",
          paidAt: invoice.paidAt || invoice.createdAt || new Date(),
          recordedBy: req.user._id,
        });
      }

      receipt = await createReceiptForPayment({
        payment,
        invoice,
        appointmentId: invoice.appointmentId?._id,
        doctorId: invoice.doctorId?._id,
      });

      receipt = await Receipt.findById(receipt._id)
        .populate("patientId")
        .populate("appointmentId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("paymentId");
    }

    const org = await getOrganizationData();
    const normalized = buildNormalizedReceipt(receipt, invoice, org);

    return sendSuccess(res, { receipt: normalized, rawReceipt: receipt, normalized, invoice, organization: org }, "Receipt retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieve receipt directly for a payment ID (Section 5 Requirement)
 */
async function getReceiptByPaymentId(req, res, next) {
  try {
    const { paymentId } = req.params;
    let payment = null;

    if (mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await Payment.findById(paymentId);
    }
    if (!payment) {
      payment = await Payment.findOne({ paymentNumber: paymentId });
    }

    if (!payment) {
      return next(new NotFoundError("Payment record not found"));
    }

    // Role-based privacy verification
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!patient || payment.patientId.toString() !== patient._id.toString()) {
        return next(new ForbiddenError("Access denied: You can only view your own receipts"));
      }
    }

    // Payment must be successful or refunded to have a valid receipt
    if (payment.status === "failed") {
      return next(new ValidationError("Cannot generate receipt for a failed payment transaction."));
    }
    if (payment.status === "pending" || payment.status === "initiated") {
      return next(new ValidationError("Payment is pending verification. Receipt is issued only after confirmed payment."));
    }

    let receipt = await Receipt.findOne({ paymentId: payment._id })
      .populate("patientId")
      .populate("invoiceId")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("appointmentId")
      .populate("paymentId");

    if (!receipt && payment.status === "success") {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        receipt = await createReceiptForPayment({
          payment,
          invoice,
          appointmentId: invoice.appointmentId,
          doctorId: invoice.doctorId,
        });
        receipt = await Receipt.findById(receipt._id)
          .populate("patientId")
          .populate("invoiceId")
          .populate({
            path: "doctorId",
            populate: { path: "userId", select: "name" },
          })
          .populate("appointmentId")
          .populate("paymentId");
      }
    }

    if (!receipt) {
      return next(new NotFoundError("Receipt not found for this payment record"));
    }

    const allowed = await canAccessBillingDocument(req.user, receipt);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to view this receipt"));
    }

    const org = await getOrganizationData();
    const normalized = buildNormalizedReceipt(receipt, receipt.invoiceId, org);

    return sendSuccess(res, { receipt: normalized, rawReceipt: receipt, normalized, payment, organization: org }, "Payment receipt retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Public Verification Endpoint (Privacy-safe: no raw PHI, email, or full phone revealed)
 */
async function verifyReceiptByToken(req, res, next) {
  try {
    const token = req.params.token || req.query.token;
    if (!token) {
      return next(new ValidationError("Verification token is required"));
    }

    const receipt = await Receipt.findOne({ verificationToken: token.trim() })
      .populate("patientId", "fullName patientCode")
      .populate("invoiceId", "invoiceNumber totalAmount status")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("appointmentId", "serviceName appointmentDate");

    if (!receipt) {
      return sendSuccess(
        res,
        {
          verified: false,
          message: "No matching official TriGyna receipt was found for this verification reference.",
        },
        "Verification check completed"
      );
    }

    const patName = receipt.patientSnapshot?.fullName || receipt.patientId?.fullName;
    const docName = receipt.doctorSnapshot?.name || receipt.doctorId?.userId?.name || receipt.doctorId?.name || "Consultant Doctor";
    const svcName = receipt.appointmentSnapshot?.serviceName || receipt.appointmentId?.serviceName || "Clinical Consultation";

    return sendSuccess(
      res,
      {
        verified: true,
        receiptNumber: receipt.receiptNumber,
        invoiceNumber: receipt.invoiceId?.invoiceNumber,
        amountReceived: receipt.amountReceived,
        currency: receipt.currency,
        issuedAt: receipt.issuedAt,
        status: receipt.status,
        maskedPatient: maskName(patName),
        serviceName: svcName,
        consultantName: docName,
        organization: "TriGyna Women Health & Wellness",
        verificationTimestamp: new Date().toISOString(),
      },
      "Receipt successfully authenticated via TriGyna digital record verification"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * Stream or Download high-fidelity PDF
 */
async function downloadReceiptPdf(req, res, next) {
  try {
    const id = req.params.id || req.params.invoiceId || req.params.paymentId;
    let receipt = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      receipt = await Receipt.findOne({
        $or: [
          { _id: id },
          { invoiceId: id },
          { paymentId: id },
        ],
      })
        .populate("patientId")
        .populate("invoiceId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId")
        .populate("paymentId");
    }

    if (!receipt) {
      receipt = await Receipt.findOne({ receiptNumber: id })
        .populate("patientId")
        .populate("invoiceId")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId")
        .populate("paymentId");
    }

    if (!receipt && mongoose.Types.ObjectId.isValid(id)) {
      // Check if it's an invoice ID and auto-generate receipt if paid
      const invoice = await Invoice.findById(id).populate("patientId").populate("appointmentId").populate("doctorId");
      if (invoice && (invoice.status === "paid" || invoice.status === "partially_paid" || invoice.status === "refunded")) {
        let payment = await Payment.findOne({ invoiceId: invoice._id, status: "success" });
        if (!payment) {
          payment = await Payment.create({
            paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
            invoiceId: invoice._id,
            patientId: invoice.patientId._id || invoice.patientId,
            amount: invoice.paidAmount || invoice.totalAmount,
            currency: invoice.currency || "INR",
            paymentMethod: invoice.paymentMethod !== "none" ? invoice.paymentMethod : "upi",
            paymentProvider: "manual_pos",
            providerTransactionId: undefined,
            status: "success",
            paidAt: invoice.paidAt || invoice.createdAt || new Date(),
            recordedBy: req.user._id,
          });
        }
        receipt = await createReceiptForPayment({
          payment,
          invoice,
          appointmentId: invoice.appointmentId?._id,
          doctorId: invoice.doctorId?._id,
        });
        receipt = await Receipt.findById(receipt._id)
          .populate("patientId")
          .populate("invoiceId")
          .populate({
            path: "doctorId",
            populate: { path: "userId", select: "name" },
          })
          .populate("appointmentId")
          .populate("paymentId");
      }
    }

    if (!receipt) {
      return next(new NotFoundError("Receipt not found"));
    }

    const allowed = await canAccessBillingDocument(req.user, receipt);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to download this receipt PDF"));
    }

    const org = await getOrganizationData();
    const pdfData = buildNormalizedReceipt(receipt, receipt.invoiceId, org);

    const filename = `TriGyna-Receipt-${receipt.receiptNumber.replace(/[\/\\]/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    await generateReceiptPdf(pdfData, res, org);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listReceipts,
  getReceiptById,
  getReceiptByInvoiceId,
  getReceiptByPaymentId,
  verifyReceiptByToken,
  downloadReceiptPdf,
  buildNormalizedReceipt,
};

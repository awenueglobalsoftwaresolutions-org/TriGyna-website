const crypto = require("crypto");
const mongoose = require("mongoose");
const Receipt = require("./receipt.model");
const Invoice = require("./invoice.model");
const Payment = require("./payment.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError } = require("../../shared/errors");

// Helper to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Helper to mask patient name for public verification (e.g. "Ananya Sharma" -> "A***** S*****")
function maskName(name) {
  if (!name || typeof name !== "string") return "Valued Patient";
  const trimmed = name.trim();
  if (!trimmed) return "Valued Patient";
  return trimmed
    .split(/\s+/)
    .map((part) => (part.length > 1 ? part[0] + "*".repeat(Math.min(part.length - 1, 5)) : part))
    .join(" ");
}

/**
 * Public Document Verification Endpoint
 * Validates Invoices and Receipts against authoritative MongoDB ledger records.
 * Strictly enforces privacy: Zero PHI, no patient phone, email, address, or internal IDs.
 */
async function verifyDocument(req, res, next) {
  try {
    const rawRef =
      req.params.reference ||
      req.params.token ||
      req.query.reference ||
      req.query.token ||
      req.query.doc ||
      req.query.id;

    if (!rawRef || typeof rawRef !== "string" || !rawRef.trim()) {
      return next(new ValidationError("A valid document number or verification token is required."));
    }

    const ref = rawRef.trim();

    // 1. First, search for matching Receipt
    // Can match verificationToken, verificationTokenHash, or receiptNumber (e.g. RCP/2026/010055)
    let receiptQuery = {
      $or: [
        { verificationToken: ref },
        { receiptNumber: new RegExp(`^${escapeRegex(ref)}$`, "i") },
      ],
    };

    // If string is 64 hex chars, test hash match as well
    if (/^[0-9a-f]{64}$/i.test(ref)) {
      receiptQuery.$or.push({ verificationTokenHash: ref.toLowerCase() });
    }

    const receipt = await Receipt.findOne(receiptQuery)
      .populate("patientId", "fullName patientCode")
      .populate("invoiceId", "invoiceNumber totalAmount paidAmount balanceAmount status items createdAt")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("appointmentId", "serviceName appointmentDate")
      .populate("paymentId", "paymentNumber amount status paymentMethod paidAt");

    if (receipt) {
      // Analyze status and relationships
      const inv = receipt.invoiceId;
      const payment = receipt.paymentId;

      let outcome = "fully_paid";
      let outcomeLabel = "Verified Document — Fully Paid";
      let verified = true;

      if (receipt.status === "refunded" || payment?.status === "refunded" || inv?.status === "refunded") {
        outcome = "refunded";
        outcomeLabel = "Refunded or Reversed Payment Receipt";
      } else if (receipt.status === "cancelled") {
        outcome = "cancelled";
        outcomeLabel = "Cancelled or Voided Receipt";
        verified = false;
      } else if (payment && payment.status === "failed") {
        outcome = "inconsistent_record";
        outcomeLabel = "Record Inconsistency Detected — Contact Clinic Administration";
        verified = false;
      } else if (inv && inv.balanceAmount > 0) {
        outcome = "partially_paid";
        outcomeLabel = "Verified Document — Partially Paid (Balance Pending on Invoice)";
      }

      const patName = receipt.patientSnapshot?.fullName || receipt.patientId?.fullName;
      const docName =
        receipt.doctorSnapshot?.name ||
        receipt.doctorId?.userId?.name ||
        receipt.doctorId?.name ||
        "Consultant Doctor";
      const svcName =
        receipt.appointmentSnapshot?.serviceName ||
        receipt.appointmentId?.serviceName ||
        inv?.items?.[0]?.description ||
        "Clinical Consultation & Care";

      const totalAmount =
        receipt.financialSnapshot?.totalAmount !== undefined
          ? receipt.financialSnapshot.totalAmount
          : inv?.totalAmount !== undefined
          ? inv.totalAmount
          : receipt.amountReceived;

      const balanceAmount =
        receipt.financialSnapshot?.balanceAmount !== undefined
          ? receipt.financialSnapshot.balanceAmount
          : inv?.balanceAmount !== undefined
          ? inv.balanceAmount
          : 0;

      return sendSuccess(
        res,
        {
          verified,
          outcome,
          outcomeLabel,
          documentType: "receipt",
          documentNumber: receipt.receiptNumber,
          invoiceNumber: inv?.invoiceNumber || (typeof receipt.invoiceId === "string" ? receipt.invoiceId : undefined),
          issueDate: receipt.issuedAt,
          organizationName: "TriGyna Women Health & Wellness",
          serviceCategory: svcName,
          totalAmount,
          amountPaid: receipt.amountReceived,
          balanceAmount,
          currency: receipt.currency || "INR",
          paymentStatus: receipt.status === "refunded" ? "refunded" : (inv?.status === "partially_paid" ? "partially_paid" : "paid"),
          documentStatus: receipt.status,
          maskedPatient: maskName(patName),
          consultantName: docName,
          verificationTimestamp: new Date().toISOString(),
        },
        "Receipt record authenticated against TriGyna ledger"
      );
    }

    // 2. Second, search for matching Invoice
    // Can match verificationToken or invoiceNumber (e.g. TRI/2026/000458 or INV-2026-1157)
    let invoiceQuery = {
      $or: [
        { invoiceNumber: new RegExp(`^${escapeRegex(ref)}$`, "i") },
      ],
    };

    if (ref.length >= 16) {
      invoiceQuery.$or.push({ verificationToken: ref });
      if (/^[0-9a-f]{64}$/i.test(ref)) {
        invoiceQuery.$or.push({ verificationTokenHash: ref.toLowerCase() });
      }
    }

    const invoice = await Invoice.findOne(invoiceQuery)
      .populate("patientId", "fullName patientCode")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("appointmentId", "serviceName appointmentDate");

    if (invoice) {
      let outcome = "payment_pending";
      let outcomeLabel = "Verified Invoice — Payment Pending";
      let verified = true;

      const paidAmount = Number(invoice.paidAmount) || 0;
      const totalAmount = Number(invoice.totalAmount) || 0;
      const balanceAmount =
        invoice.balanceAmount !== undefined
          ? Number(invoice.balanceAmount)
          : Math.max(0, totalAmount - paidAmount);

      if (invoice.status === "cancelled") {
        outcome = "cancelled";
        outcomeLabel = "Cancelled or Voided Invoice";
        verified = false;
      } else if (invoice.status === "refunded") {
        outcome = "refunded";
        outcomeLabel = "Refunded Tax Invoice";
      } else if (totalAmount < 0 || isNaN(totalAmount)) {
        outcome = "inconsistent_record";
        outcomeLabel = "Record Inconsistency Detected — Contact Clinic Administration";
        verified = false;
      } else if (paidAmount >= totalAmount && totalAmount > 0) {
        outcome = "fully_paid";
        outcomeLabel = "Verified Invoice — Fully Paid";
      } else if (paidAmount > 0 && balanceAmount > 0) {
        outcome = "partially_paid";
        outcomeLabel = "Verified Invoice — Partially Paid";
      } else if (paidAmount === 0) {
        outcome = "payment_pending";
        outcomeLabel = "Verified Invoice — Payment Pending";
      }

      const patName = invoice.patientId?.fullName;
      const docName =
        invoice.doctorId?.userId?.name ||
        invoice.doctorId?.name ||
        "Consultant Doctor";
      const svcName =
        invoice.appointmentId?.serviceName ||
        invoice.items?.[0]?.description ||
        "Clinical Consultation & Care";

      return sendSuccess(
        res,
        {
          verified,
          outcome,
          outcomeLabel,
          documentType: "invoice",
          documentNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate || invoice.createdAt,
          organizationName: invoice.organizationSnapshot?.name || "TriGyna Women Health & Wellness",
          serviceCategory: svcName,
          totalAmount,
          amountPaid: paidAmount,
          balanceAmount,
          currency: invoice.currency || "INR",
          paymentStatus: invoice.status,
          documentStatus: invoice.status,
          maskedPatient: maskName(patName),
          consultantName: docName,
          verificationTimestamp: new Date().toISOString(),
        },
        "Invoice record authenticated against TriGyna ledger"
      );
    }

    // 3. Document Not Found
    return sendSuccess(
      res,
      {
        verified: false,
        outcome: "not_found",
        outcomeLabel: "Document Not Found",
        message: "No official TriGyna invoice or receipt was found for this verification reference.",
        verificationTimestamp: new Date().toISOString(),
      },
      "Document verification query completed"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  verifyDocument,
  maskName,
};


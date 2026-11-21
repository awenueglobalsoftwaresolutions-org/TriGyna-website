const mongoose = require("mongoose");
const crypto = require("crypto");
const env = require("../../config/env");
const Invoice = require("./invoice.model");
const Expense = require("./expense.model");
const Payment = require("./payment.model");
const Receipt = require("./receipt.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const Appointment = require("../appointments/appointment.model");
const Organization = require("../organization/organization.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { canAccessBillingDocument } = require("../auth/authorization.service");
const {
  roundToTwo,
  generateInvoiceNumber,
  generateReceiptNumber,
  calculateInvoiceTotals,
  createReceiptForPayment,
  recordLedgerEntry,
} = require("./billing.service");
const { generateReceiptPdf } = require("./receipt-pdf.service");
const { generateInvoicePdf } = require("./invoice-pdf.service");
const razorpayService = require("./razorpay.service");
const { safeRegex } = require("../../shared/regex.utils");
const { dispatchNotificationEvent } = require("../notifications/notification.service");

// Helper to generate unique collision-free expense number
async function generateExpenseNumber() {
  const year = new Date().getFullYear();
  let candidate;
  let exists = true;
  let counter = (await Expense.countDocuments()) + 1;
  while (exists) {
    candidate = `EXP-${year}-${1000 + counter}`;
    const found = await Expense.exists({ expenseNumber: candidate });
    if (!found) {
      exists = false;
    } else {
      counter++;
    }
  }
  return candidate;
}

async function listInvoices(req, res, next) {
  try {
    const { status, search, patientId, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (req.user.role === "hrms") {
      return next(new ForbiddenError("Access denied: HRMS staff are not authorized to view financial invoices"));
    }

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    // Patient role can only view their own invoices
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return sendSuccess(res, { invoices: [], total: 0 }, "No invoices found for patient");
      }
      filter.patientId = patient._id;
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found for authenticated user"));
      }
      filter.doctorId = doctor._id;
    }

    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        filter.invoiceNumber = regex;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("patientId", "patientCode fullName phone email")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId", "appointmentCode serviceName appointmentDate startTime endTime mode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Invoice.countDocuments(filter),
    ]);

    return sendSuccess(res, { invoices, total, page: parseInt(page, 10) }, "Invoices retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("patientId", "patientCode fullName phone email address")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("appointmentId")
      .populate("payments.recordedBy", "name role")
      .populate("payments.receiptId")
      .populate("refundDetails.refundedBy", "name role");

    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
    }

    const allowed = await canAccessBillingDocument(req.user, invoice);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to view this invoice"));
    }

    return sendSuccess(res, { invoice }, "Invoice details retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Stream or Download official A4 TriGyna Invoice PDF
 */
async function downloadInvoicePdf(req, res, next) {
  try {
    const id = req.params.id;
    let invoice = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await Invoice.findById(id)
        .populate("patientId", "patientCode fullName phone email address")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId");
    }

    if (!invoice) {
      invoice = await Invoice.findOne({ invoiceNumber: id })
        .populate("patientId", "patientCode fullName phone email address")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("appointmentId");
    }

    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
    }

    const allowed = await canAccessBillingDocument(req.user, invoice);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to download this invoice PDF"));
    }

    const org = await Organization.findOne({ status: "active" }).lean();
    const filename = `TriGyna-Invoice-${invoice.invoiceNumber.replace(/[\/\\]/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    await generateInvoicePdf(invoice, res, org);
  } catch (err) {
    return next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const {
      patientId,
      doctorId,
      appointmentId,
      items,
      discountAmount = 0,
      taxRate = 0,
      taxAmount = 0,
      prefix = "INV", // supports TRI or INV
      notes,
    } = req.body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return next(new ValidationError("Patient ID and at least one line item are required"));
    }

    // Verify patient existence
    const patientExists = await Patient.findById(patientId);
    if (!patientExists) {
      return next(new NotFoundError("Referenced patient record not found"));
    }

    // Verify doctor existence and validity if specified
    if (doctorId) {
      const doctorExists = await Doctor.findById(doctorId);
      if (!doctorExists || doctorExists.status !== "active") {
        return next(new ValidationError("Referenced doctor is invalid or inactive"));
      }
    }

    // Verify appointment relationship if specified
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return next(new NotFoundError("Referenced appointment not found"));
      }
      if (appointment.patientId.toString() !== patientId.toString()) {
        return next(new ValidationError("Referenced appointment does not belong to the specified patient"));
      }
      if (doctorId && appointment.doctorId && appointment.doctorId.toString() !== doctorId.toString()) {
        return next(new ValidationError("Referenced appointment doctor does not match the invoice doctor"));
      }
    }

    // Decimal-safe authoritative calculation
    const calc = calculateInvoiceTotals(items, discountAmount, Number(taxRate) || (Number(taxAmount) > 0 ? 0 : 0));
    const finalTaxAmount = Number(taxAmount) > 0 ? Number(taxAmount) : calc.taxAmount;
    const finalTotal = roundToTwo(calc.taxableAmount + finalTaxAmount);

    const invoiceNumber = await generateInvoiceNumber(prefix);

    const isInitiallyPaid = req.body.status === "paid";
    const initialPaidAmount = isInitiallyPaid ? finalTotal : 0;
    const initialBalance = isInitiallyPaid ? 0 : finalTotal;
    const initialStatus = isInitiallyPaid ? "paid" : "pending";
    const paymentMethod = req.body.paymentMethod && ["upi", "card", "cash", "bank_transfer", "netbanking", "wallet"].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : (isInitiallyPaid ? "upi" : "none");

    const paymentProvider = req.body.paymentProvider || (paymentMethod === "upi" ? "phonepe" : "manual_pos");
    const providerTransactionId = req.body.transactionRef ? req.body.transactionRef.trim() : undefined;

    const invoiceType = req.body.invoiceType && ["consultation", "service", "package", "follow-up", "procedure", "other"].includes(req.body.invoiceType)
      ? req.body.invoiceType
      : "consultation";
    const branchName = req.body.branchName ? req.body.branchName.trim() : "Main Clinic (Pune - Baner)";

    // CGST/SGST/IGST breakdown
    const taxBreakdown = {
      cgst: roundToTwo(finalTaxAmount / 2),
      sgst: roundToTwo(finalTaxAmount / 2),
      igst: 0,
    };

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      doctorId: doctorId || undefined,
      appointmentId: appointmentId || undefined,
      invoiceType,
      branchName,
      items: calc.items,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      taxableAmount: calc.taxableAmount,
      taxRate: Number(taxRate) || 0,
      taxAmount: finalTaxAmount,
      taxBreakdown,
      totalAmount: finalTotal,
      paidAmount: initialPaidAmount,
      balanceAmount: initialBalance,
      status: initialStatus,
      paymentMethod,
      issueDate: new Date(),
      paidAt: isInitiallyPaid ? new Date() : undefined,
      createdBy: req.user._id,
      notes: notes ? notes.trim() : "",
    });

    const { recordLedgerEntry } = require("./billing.service");
    await recordLedgerEntry({
      entryType: "invoice_issued",
      classification: "debit",
      amount: finalTotal,
      invoiceId: invoice._id,
      patientId,
      description: `Invoice ${invoiceNumber} issued (${invoiceType})`,
      balanceAfter: initialBalance,
      recordedBy: req.user._id,
    });

    let paymentRecord = null;
    let receiptRecord = null;

    if (isInitiallyPaid) {
      paymentRecord = await Payment.create({
        paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        invoiceId: invoice._id,
        patientId,
        amount: finalTotal,
        currency: invoice.currency || "INR",
        paymentMethod,
        paymentProvider,
        providerTransactionId,
        status: "success",
        paidAt: new Date(),
        recordedBy: req.user._id,
        notes: "Immediate point-of-sale payment",
      });

      receiptRecord = await createReceiptForPayment({
        payment: paymentRecord,
        invoice,
        appointmentId,
        doctorId,
      });

      invoice.payments.push({
        amount: finalTotal,
        paymentMethod,
        paymentProvider,
        transactionRef: providerTransactionId,
        receiptId: receiptRecord._id,
        receiptNumber: receiptRecord.receiptNumber,
        recordedBy: req.user._id,
        recordedAt: new Date(),
        notes: "Immediate POS payment",
      });
      await invoice.save();
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "INVOICE_CREATED",
      targetEntity: "Invoice",
      targetId: invoice._id.toString(),
      details: { invoiceNumber, totalAmount: finalTotal, patientId, isInitiallyPaid },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { invoice, payment: paymentRecord, receipt: receiptRecord },
      "Invoice generated successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
}

async function recordPayment(req, res, next) {
  try {
    const {
      amount,
      paymentMethod = "upi",
      paymentProvider = "manual_pos",
      transactionRef,
      idempotencyKey,
      notes,
    } = req.body;

    const paymentAmt = roundToTwo(amount);
    if (!paymentAmt || paymentAmt <= 0) {
      return next(new ValidationError("A valid payment amount greater than 0 is required"));
    }

    // Check idempotency key if supplied
    if (idempotencyKey) {
      const existingPayment = await Payment.findOne({ idempotencyKey: idempotencyKey.trim() });
      if (existingPayment) {
        const inv = await Invoice.findById(existingPayment.invoiceId);
        const rcp = await Receipt.findOne({ paymentId: existingPayment._id });
        return sendSuccess(
          res,
          { invoice: inv, payment: existingPayment, receipt: rcp, idempotent: true },
          "Payment already recorded previously"
        );
      }
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
    }

    if (invoice.status === "paid") {
      return next(new ValidationError("This invoice has already been fully paid"));
    }
    if (invoice.status === "refunded" || invoice.status === "cancelled") {
      return next(new ValidationError(`Cannot record payment on a ${invoice.status} invoice`));
    }

    const currentBalance = roundToTwo(invoice.totalAmount - (invoice.paidAmount || 0));
    if (paymentAmt > currentBalance) {
      return next(
        new ValidationError(
          `Payment amount (₹${paymentAmt}) exceeds outstanding balance (₹${currentBalance})`
        )
      );
    }

    const providerTransactionId =
      transactionRef ? transactionRef.trim() : undefined;

    let session = null;
    let inTransaction = false;
    const supportsTransactions =
      mongoose.connection.client?.topology?.description?.type &&
      mongoose.connection.client.topology.description.type !== "Single";

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        inTransaction = true;
      } catch (sessionErr) {
        if (session) await session.endSession().catch(() => {});
        session = null;
        inTransaction = false;
      }
    }

    let payment;
    let receipt;

    try {
      // Create persistent Payment document inside transaction (or standalone fallback)
      const paymentData = {
        paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        invoiceId: invoice._id,
        patientId: invoice.patientId,
        amount: paymentAmt,
        currency: invoice.currency || "INR",
        paymentMethod,
        paymentProvider,
        providerTransactionId,
        idempotencyKey: idempotencyKey ? idempotencyKey.trim() : undefined,
        status: "success",
        paidAt: new Date(),
        recordedBy: req.user._id,
        notes: notes ? notes.trim() : "",
      };

      const createdPayments = await Payment.create(
        [paymentData],
        session ? { session } : {}
      );
      payment = createdPayments[0];

      // Update invoice running ledger
      invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + paymentAmt);
      invoice.balanceAmount = roundToTwo(invoice.totalAmount - invoice.paidAmount);

      if (invoice.balanceAmount <= 0) {
        invoice.status = "paid";
        invoice.paidAt = new Date();
        invoice.paymentMethod = paymentMethod;
      } else {
        invoice.status = "partially_paid";
      }

      // Generate verified receipt
      receipt = await createReceiptForPayment({
        payment,
        invoice,
        appointmentId: invoice.appointmentId,
        doctorId: invoice.doctorId,
      });

      invoice.payments.push({
        amount: paymentAmt,
        paymentMethod,
        paymentProvider,
        transactionRef: providerTransactionId,
        receiptId: receipt._id,
        receiptNumber: receipt.receiptNumber,
        notes: notes ? notes.trim() : "",
        recordedBy: req.user._id,
        recordedAt: new Date(),
      });

      if (session) {
        await invoice.save({ session });
        await session.commitTransaction();
      } else {
        await invoice.save();
      }

      const { recordLedgerEntry } = require("./billing.service");
      await recordLedgerEntry({
        entryType: paymentMethod === "cash" ? "offline_payment" : "payment_received",
        classification: "credit",
        amount: paymentAmt,
        invoiceId: invoice._id,
        paymentId: payment._id,
        receiptId: receipt._id,
        patientId: invoice.patientId,
        description: `Payment received (${paymentMethod.toUpperCase()}) for invoice ${invoice.invoiceNumber}`,
        balanceAfter: invoice.balanceAmount,
        recordedBy: req.user._id,
        gatewayRef: providerTransactionId,
      });
    } catch (err) {
      if (inTransaction && session) {
        await session.abortTransaction().catch(() => {});
      }
      if (err.code === 11000 && idempotencyKey) {
        // Race collision on idempotency key: retrieve existing payment
        const existingPayment = await Payment.findOne({ idempotencyKey: idempotencyKey.trim() });
        if (existingPayment) {
          const inv = await Invoice.findById(existingPayment.invoiceId);
          const rcp = await Receipt.findOne({ paymentId: existingPayment._id });
          return sendSuccess(
            res,
            { invoice: inv, payment: existingPayment, receipt: rcp, idempotent: true },
            "Payment already recorded previously"
          );
        }
      }
      throw err;
    } finally {
      if (session) {
        await session.endSession().catch(() => {});
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYMENT_RECORDED",
      targetEntity: "Invoice",
      targetId: invoice._id.toString(),
      details: {
        invoiceNumber: invoice.invoiceNumber,
        receiptNumber: receipt.receiptNumber,
        paymentAmt,
        paymentMethod,
        remainingBalance: invoice.balanceAmount,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { invoice, payment, receipt },
      "Payment successfully recorded, balance updated, and receipt generated"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * Payment Gateway: Create Razorpay Order for online payment
 */
async function createPaymentOrder(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(new NotFoundError("Invoice not found"));

    const allowed = await canAccessBillingDocument(req.user, invoice);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to make a payment on this invoice"));
    }

    if (invoice.status === "paid") {
      return next(new ValidationError("Invoice is already fully paid"));
    }

    if (["cancelled", "refunded"].includes(invoice.status)) {
      return next(new ValidationError(`Invoice cannot accept payments as its status is ${invoice.status}`));
    }

    const currentBalance = roundToTwo(invoice.totalAmount - (invoice.paidAmount || 0));
    if (currentBalance <= 0) {
      return next(new ValidationError("Invoice has no outstanding payable balance"));
    }

    const payableAmount = req.body.amount ? Math.min(currentBalance, roundToTwo(req.body.amount)) : currentBalance;

    // Create official Razorpay Order via service
    const order = await razorpayService.createOrder({
      amountRupees: payableAmount,
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice._id.toString(),
        patientId: invoice.patientId?.toString(),
        appointmentId: invoice.appointmentId?.toString() || "",
      },
    });

    const paymentInitiation = await Payment.create({
      paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      doctorId: invoice.doctorId,
      appointmentId: invoice.appointmentId,
      amount: payableAmount,
      currency: invoice.currency || "INR",
      paymentMethod: req.body.paymentMethod || "upi",
      paymentProvider: "razorpay",
      providerOrderId: order.id,
      providerTransactionId: order.id,
      status: "initiated",
      notes: `Razorpay order created for invoice ${invoice.invoiceNumber}`,
      metadata: {
        orderId: order.id,
        amountInPaise: order.amount,
        mode: razorpayService.mode,
      },
    });

    return sendSuccess(
      res,
      {
        orderId: order.id,
        paymentId: paymentInitiation._id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: payableAmount,
        amountInPaise: order.amount,
        currency: "INR",
        provider: "razorpay",
        keyId: order.keyId,
        mode: razorpayService.mode,
      },
      "Razorpay payment order initialized"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * Payment Gateway: Verify Razorpay payment signature and issue receipt
 */
async function verifyPayment(req, res, next) {
  try {
    const {
      paymentId,
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      providerTransactionId,
      providerSignature,
      status = "success",
    } = req.body;

    const effectiveOrderId = razorpay_order_id || orderId;
    const effectivePaymentId = razorpay_payment_id || providerTransactionId || `pay_${Date.now()}`;
    const effectiveSignature = razorpay_signature || providerSignature;

    let payment;
    if (paymentId) {
      payment = await Payment.findById(paymentId);
    }
    
    if (!payment && (effectiveOrderId || effectivePaymentId)) {
      const queryOr = [];
      if (effectiveOrderId) {
        queryOr.push({ providerOrderId: effectiveOrderId }, { providerTransactionId: effectiveOrderId });
      }
      if (effectivePaymentId) {
        queryOr.push({ providerPaymentId: effectivePaymentId }, { providerTransactionId: effectivePaymentId });
      }
      payment = await Payment.findOne({ $or: queryOr });
    }

    if (!payment) {
      return next(new NotFoundError("Payment record not found for verification"));
    }

    const allowed = await canAccessBillingDocument(req.user, payment);
    if (!allowed) {
      return next(new ForbiddenError("Access denied: You are not authorized to verify this payment"));
    }

    if (payment.status === "success") {
      const [receipt, invoice] = await Promise.all([
        Receipt.findOne({ paymentId: payment._id }),
        Invoice.findById(payment.invoiceId),
      ]);
      return sendSuccess(res, { payment, receipt, invoice }, "Payment already verified");
    }

    if (status !== "success") {
      payment.status = "failed";
      await payment.save();
      return sendSuccess(res, { payment, status: "failed" }, "Payment marked failed");
    }

    // Mandatory Cryptographic HMAC Signature Verification (Section 2 & 6 non-negotiable)
    if (!effectiveSignature) {
      return next(new ValidationError("Cryptographic payment signature is strictly required for online payment verification."));
    }

    const isValid = razorpayService.verifyPaymentSignature({
      orderId: effectiveOrderId || payment.providerOrderId || payment.providerTransactionId,
      paymentId: effectivePaymentId,
      signature: effectiveSignature,
    });

    if (!isValid) {
      return next(new ValidationError("Invalid Razorpay payment signature. Verification failed."));
    }

    payment.status = "success";
    payment.paidAt = new Date();
    payment.providerTransactionId = effectivePaymentId;
    payment.providerPaymentId = effectivePaymentId;
    if (effectiveOrderId) {
      payment.providerOrderId = effectiveOrderId;
    }
    await payment.save();

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) return next(new NotFoundError("Associated invoice not found"));

    invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + payment.amount);
    invoice.balanceAmount = roundToTwo(Math.max(0, invoice.totalAmount - invoice.paidAmount));
    invoice.status = invoice.balanceAmount <= 0 ? "paid" : "partially_paid";
    invoice.paidAt = new Date();
    invoice.paymentMethod = payment.paymentMethod || "upi";

    const receipt = await createReceiptForPayment({
      payment,
      invoice,
      appointmentId: invoice.appointmentId,
      doctorId: invoice.doctorId,
    });

    invoice.payments.push({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentProvider: "razorpay",
      transactionRef: payment.providerTransactionId,
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      recordedAt: new Date(),
      notes: "Online Razorpay verification",
    });

    await invoice.save();

    // Trigger multi-channel event notification (In-app, Email, Push)
    try {
      const patientUser = await Patient.findById(invoice.patientId).populate("userId");
      await dispatchNotificationEvent("payment.captured", {
        invoice,
        payment,
        receipt,
        patientUser: patientUser?.userId,
      });
    } catch (notifErr) {
      console.warn("[Billing] Payment notification dispatch note:", notifErr.message);
    }

    await recordAudit({
      actorId: req.user?._id,
      actorRole: req.user?.role || "patient",
      action: "PAYMENT_VERIFIED",
      targetEntity: "Payment",
      targetId: payment._id.toString(),
      details: {
        invoiceNumber: invoice.invoiceNumber,
        amount: payment.amount,
        receiptNumber: receipt.receiptNumber,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { payment, receipt, invoice }, "Payment verified and receipt issued successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Razorpay Payment Gateway Webhook handler (Idempotent processing & Signature verification)
 */
async function handlePaymentWebhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];

    // In production environments, x-razorpay-signature header is mandatory
    if (env.NODE_ENV === "production" && !signature) {
      console.warn("[Razorpay Webhook] Missing required x-razorpay-signature header in production");
      return res.status(401).json({ error: "Missing required webhook signature header" });
    }

    // Verify webhook signature if provided
    if (signature) {
      const isValid = razorpayService.verifyWebhookSignature(req.rawBody || req.body, signature);
      if (!isValid) {
        console.warn("[Razorpay Webhook] Signature verification failed");
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const { event, payload } = req.body;
    const providerTxnId = payload?.payment?.entity?.id || payload?.payment?.id || payload?.transactionId;
    const orderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
    const paymentLinkId = payload?.payment_link?.entity?.id || payload?.payment_link?.id;

    if (!providerTxnId && !orderId && !paymentLinkId && !payload?.refund?.entity?.id) {
      return res.status(200).json({ status: "ok", received: true, success: true, data: { received: true } });
    }

    const PaymentWebhookEvent = require("./payment-webhook-event.model");
    const PaymentTransaction = require("./payment-transaction.model");

    const eventId =
      req.headers["x-razorpay-event-id"] ||
      req.body.id ||
      `evt_${providerTxnId || paymentLinkId || orderId || Date.now()}`;

    // Event-level idempotency
    const existingWebhookEvent = await PaymentWebhookEvent.findOne({ eventId });
    if (existingWebhookEvent && existingWebhookEvent.processingStatus === "processed") {
      return res.status(200).json({
        status: "ok",
        received: true,
        idempotent: true,
        success: true,
        data: { received: true, idempotent: true },
      });
    }

    if (!existingWebhookEvent) {
      try {
        await PaymentWebhookEvent.create({
          eventId,
          eventType: event || "unknown",
          razorpayEntityId: providerTxnId || paymentLinkId || orderId,
          signatureVerified: Boolean(signature),
          processingStatus: "pending",
          payload: req.body,
        });
      } catch (evtErr) {
        const raceEvent = await PaymentWebhookEvent.findOne({ eventId });
        if (raceEvent && raceEvent.processingStatus === "processed") {
          return res.status(200).json({
            status: "ok",
            received: true,
            idempotent: true,
            success: true,
            data: { received: true, idempotent: true },
          });
        }
      }
    }

    // Idempotency check: already marked success?
    if (providerTxnId) {
      const existing = await Payment.findOne({
        $or: [
          { providerTransactionId: providerTxnId, status: "success" },
          { razorpayPaymentId: providerTxnId, paymentStatus: "PAID" },
          { "metadata.orderId": orderId, status: "success" },
        ],
      });

      if (existing) {
        await PaymentWebhookEvent.updateOne(
          { eventId },
          { processingStatus: "duplicate", processedAt: new Date() }
        );
        return res.status(200).json({
          status: "ok",
          received: true,
          idempotent: true,
          success: true,
          data: { received: true, idempotent: true },
        });
      }
    }

    // Handle Payment Link events
    if (event === "payment_link.paid" || event === "payment_link.partially_paid") {
      const PaymentLink = require("./payment-link.model");
      const plink = await PaymentLink.findOne({
        $or: [{ razorpayPaymentLinkId: paymentLinkId }, { paymentLinkId: paymentLinkId }],
      });

      if (plink) {
        const paidPaise = payload?.payment?.entity?.amount || (plink.amount * 100);
        const paidRupees = roundToTwo(paidPaise / 100);

        let payment = await Payment.findOne({ providerTransactionId: providerTxnId });
        if (!payment) {
          payment = await Payment.create({
            paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
            invoiceId: plink.invoiceId,
            patientId: plink.patientId,
            amount: paidRupees,
            currency: plink.currency || "INR",
            paymentMethod: payload?.payment?.entity?.method || "upi",
            paymentProvider: "razorpay",
            providerTransactionId: providerTxnId || `pay_link_${Date.now()}`,
            providerOrderId: orderId || plink.razorpayPaymentLinkId,
            status: "success",
            paidAt: new Date(),
            notes: `Paid via Payment Link ${plink.paymentLinkId}`,
          });
        } else {
          payment.status = "success";
          payment.paidAt = new Date();
          await payment.save();
        }

        plink.paidAmount = roundToTwo((plink.paidAmount || 0) + paidRupees);
        plink.balanceDue = roundToTwo(Math.max(0, plink.amount - plink.paidAmount));
        plink.status = plink.balanceDue <= 0 ? "paid" : "partially_paid";
        plink.paidAt = new Date();
        plink.payments.push({
          paymentId: payment._id,
          razorpayPaymentId: providerTxnId,
          amount: paidRupees,
          paidAt: new Date(),
        });
        await plink.save();

        if (plink.invoiceId) {
          const invoice = await Invoice.findById(plink.invoiceId);
          if (invoice) {
            invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + paidRupees);
            invoice.balanceAmount = roundToTwo(Math.max(0, invoice.totalAmount - invoice.paidAmount));
            invoice.status = invoice.balanceAmount <= 0 ? "paid" : "partially_paid";
            invoice.paidAt = new Date();
            invoice.paymentMethod = payment.paymentMethod;

            const receipt = await createReceiptForPayment({ payment, invoice });
            invoice.payments.push({
              amount: paidRupees,
              paymentMethod: payment.paymentMethod,
              paymentProvider: "razorpay",
              transactionRef: providerTxnId,
              receiptId: receipt._id,
              receiptNumber: receipt.receiptNumber,
              recordedAt: new Date(),
              notes: `Razorpay Payment Link webhook (${event})`,
            });
            await invoice.save();

            // Double-entry Financial Ledger recording (Credit AR -> Cash/Bank)
            await recordLedgerEntry({
              entryType: "payment_received",
              classification: "credit",
              amount: paidRupees,
              invoiceId: invoice._id,
              patientId: invoice.patientId || plink.patientId,
              description: `Payment Link ${plink.paymentLinkId} settled via Razorpay`,
              recordedBy: null,
              gatewayRef: providerTxnId,
            });

            // Synchronize linked Order and activate package entitlement if applicable
            const effectiveOrderId = plink.orderId || invoice.orderId || payment.orderId;
            if (effectiveOrderId) {
              try {
                const Order = require("./order.model");
                const ord = await Order.findById(effectiveOrderId);
                if (ord) {
                  ord.orderStatus = "paid";
                  ord.paymentStatus = "success";
                  ord.paidAmount = ord.totalAmount;
                  ord.balanceDue = 0;
                  ord.receiptId = receipt._id;
                  await ord.save();

                  if (ord.packageId && (ord.patientId || plink.patientId)) {
                    const { grantPackageEntitlement } = require("../packages/session-ledger.service");
                    const ent = await grantPackageEntitlement({
                      patientId: ord.patientId || plink.patientId,
                      packageId: ord.packageId,
                      orderId: ord.orderNumber,
                      paymentId: payment.paymentNumber,
                      actor: null,
                    });
                    ord.entitlementId = ent._id;
                    await ord.save();
                  }

                  if (ord.leadId) {
                    try {
                      const Lead = require("../crm/lead.model");
                      await Lead.findByIdAndUpdate(ord.leadId, {
                        stage: "won",
                        status: "converted",
                        convertedToPatientId: ord.patientId || plink.patientId,
                        convertedAt: new Date(),
                      });
                    } catch (leadErr) {
                      console.warn("[Razorpay Webhook] Lead conversion warning:", leadErr.message);
                    }
                  }
                }
              } catch (ordErr) {
                console.warn("[Razorpay Webhook] Order sync warning:", ordErr.message);
              }
            }

            try {
              const patientUser = await Patient.findById(invoice.patientId || plink.patientId).populate("userId");
              await dispatchNotificationEvent("payment.captured", {
                invoice,
                payment,
                receipt,
                patientUser: patientUser?.userId,
              });
            } catch (e) {
              console.warn("[Razorpay Webhook] Event notification error:", e.message);
            }
          }
        }

        // Record PaymentTransaction
        try {
          await PaymentTransaction.create({
            paymentId: payment._id,
            invoiceId: plink.invoiceId,
            patientId: plink.patientId,
            razorpayPaymentId: providerTxnId,
            razorpayOrderId: orderId || plink.razorpayPaymentLinkId,
            razorpayPaymentLinkId: paymentLinkId,
            amount: paidRupees,
            currency: "INR",
            status: "SUCCESS",
            paymentMethod: payment.paymentMethod,
            verifiedAt: new Date(),
          });
        } catch (txnErr) {
          console.warn("[Razorpay Webhook] PaymentTransaction log notice:", txnErr.message);
        }

        await PaymentWebhookEvent.updateOne(
          { eventId },
          { processingStatus: "processed", processedAt: new Date() }
        );

        return res.status(200).json({
          status: "ok",
          received: true,
          success: true,
          statusText: "PROCESSED",
          linkId: plink.paymentLinkId,
          data: { received: true, status: "PROCESSED", linkId: plink.paymentLinkId },
        });
      }
    }

    if (event === "payment.captured" || event === "payment.success") {
      let payment = await Payment.findOne({
        $or: [
          { providerTransactionId: providerTxnId },
          { providerTransactionId: orderId },
          { "metadata.orderId": orderId },
        ],
      });

      if (payment && payment.status !== "success") {
        payment.status = "success";
        payment.paidAt = new Date();
        payment.providerTransactionId = providerTxnId || payment.providerTransactionId;
        await payment.save();

        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          if (!invoice.patientId && (payment.orderId || invoice.orderId)) {
            const Order = require("./order.model");
            const ord = await Order.findById(payment.orderId || invoice.orderId);
            if (ord?.patientId) {
              invoice.patientId = ord.patientId;
              payment.patientId = ord.patientId;
              await payment.save();
            }
          }
          invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + payment.amount);
          invoice.balanceAmount = roundToTwo(Math.max(0, invoice.totalAmount - invoice.paidAmount));
          invoice.status = invoice.balanceAmount <= 0 ? "paid" : "partially_paid";
          invoice.paidAt = new Date();
          invoice.paymentMethod = "upi";

          const receipt = await createReceiptForPayment({ payment, invoice });
          invoice.payments.push({
            amount: payment.amount,
            paymentMethod: "upi",
            paymentProvider: "razorpay",
            transactionRef: payment.providerTransactionId,
            receiptId: receipt._id,
            receiptNumber: receipt.receiptNumber,
            recordedAt: new Date(),
            notes: "Razorpay webhook payment.captured",
          });
          await invoice.save();

          // Sync linked Order and activate package entitlement if applicable
          if (payment.orderId || invoice.orderId) {
            try {
              const Order = require("./order.model");
              const ord = await Order.findById(payment.orderId || invoice.orderId);
              if (ord) {
                ord.orderStatus = "paid";
                ord.paymentStatus = "success";
                ord.paidAmount = ord.totalAmount;
                ord.balanceDue = 0;
                ord.receiptId = receipt._id;
                await ord.save();

                if (ord.packageId && ord.patientId) {
                  const { grantPackageEntitlement } = require("../packages/session-ledger.service");
                  const ent = await grantPackageEntitlement({
                    patientId: ord.patientId,
                    packageId: ord.packageId,
                    orderId: ord.orderNumber,
                    paymentId: payment.paymentNumber,
                    actor: null,
                  });
                  ord.entitlementId = ent._id;
                  await ord.save();
                }
              }
            } catch (ordErr) {
              console.warn("[Razorpay Webhook] Order sync warning:", ordErr.message);
            }
          }

          try {
            const patientUser = await Patient.findById(invoice.patientId).populate("userId");
            await dispatchNotificationEvent("payment.captured", {
              invoice,
              payment,
              receipt,
              patientUser: patientUser?.userId,
            });
          } catch (e) {
            console.warn("[Razorpay Webhook] Event notification error:", e.message);
          }
        }
      }
    } else if (event === "payment.failed") {
      const payment = await Payment.findOne({
        $or: [{ providerTransactionId: providerTxnId }, { providerTransactionId: orderId }, { razorpayPaymentId: providerTxnId }],
      });
      if (payment) {
        payment.status = "failed";
        payment.paymentStatus = "FAILED";
        await payment.save();
      }

      try {
        await PaymentTransaction.create({
          paymentId: payment?._id,
          invoiceId: payment?.invoiceId,
          patientId: payment?.patientId,
          razorpayPaymentId: providerTxnId,
          razorpayOrderId: orderId,
          amount: payload?.payment?.entity?.amount ? roundToTwo(payload.payment.entity.amount / 100) : 0,
          currency: "INR",
          status: "FAILED",
          paymentMethod: payload?.payment?.entity?.method || "upi",
          failureReason: payload?.payment?.entity?.error_description || "Transaction failed at issuing bank",
        });
      } catch (txnErr) {
        console.warn("[Razorpay Webhook] PaymentTransaction failure log notice:", txnErr.message);
      }
    }

    await PaymentWebhookEvent.updateOne(
      { eventId },
      { processingStatus: "processed", processedAt: new Date() }
    );

    return res.status(200).json({
      status: "ok",
      received: true,
      success: true,
      statusText: "PROCESSED",
      data: { received: true, status: "PROCESSED" },
    });
  } catch (err) {
    return next(err);
  }
}

async function processRefund(req, res, next) {
  try {
    const { refundAmount, refundReason } = req.body;
    const refAmt = roundToTwo(refundAmount);

    if (!refAmt || refAmt <= 0) {
      return next(new ValidationError("A valid refund amount is required"));
    }
    if (!refundReason || !refundReason.trim()) {
      return next(new ValidationError("Justification reason is required to process a refund"));
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
    }

    if (!["paid", "partially_paid"].includes(invoice.status)) {
      return next(new ValidationError("Only paid or partially paid invoices can be refunded"));
    }

    if (refAmt > invoice.paidAmount) {
      return next(new ValidationError(`Refund amount (${refAmt}) cannot exceed paid amount (${invoice.paidAmount})`));
    }

    // Call Razorpay refund service
    const refundOutcome = await razorpayService.createRefund({
      paymentId: invoice.payments?.[0]?.transactionRef || `pay_${Date.now()}`,
      amountRupees: refAmt,
      notes: { invoiceNumber: invoice.invoiceNumber, reason: refundReason },
    });

    invoice.status = "refunded";
    invoice.refundDetails = {
      refundAmount: refAmt,
      refundReason: refundReason.trim(),
      refundedAt: new Date(),
      refundedBy: req.user._id,
      providerRefundId: refundOutcome.id,
    };

    await invoice.save();

    // Mark corresponding receipts as refunded
    await Receipt.updateMany({ invoiceId: invoice._id }, { status: "refunded" });

    // Generate Credit Note for the refund
    let creditNote = null;
    try {
      const CreditNote = require("./credit-note.model");
      const creditNoteNumber = `CN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      creditNote = await CreditNote.create({
        creditNoteNumber,
        invoiceId: invoice._id,
        patientId: invoice.patientId,
        amount: refAmt,
        currency: invoice.currency || "INR",
        reason: refundReason.trim(),
        status: "issued",
        issuedAt: new Date(),
        issuedBy: req.user._id,
        notes: `Refund provider ID: ${refundOutcome.id}`,
      });
    } catch (cnErr) {
      console.warn("[Refund] Credit note notice:", cnErr.message);
    }

    // Record in immutable financial ledger
    const { recordLedgerEntry } = require("./billing.service");
    await recordLedgerEntry({
      entryType: "refund_processed",
      classification: "debit",
      amount: refAmt,
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      description: `Refund processed for invoice ${invoice.invoiceNumber}: ${refundReason.trim()}`,
      recordedBy: req.user._id,
      gatewayRef: refundOutcome.id,
    });

    try {
      const patientUser = await Patient.findById(invoice.patientId).populate("userId");
      await dispatchNotificationEvent("refund.processed", {
        invoice,
        refundAmount: refAmt,
        patientUser: patientUser?.userId,
      });
    } catch (e) {
      console.warn("[Refund] Notification error:", e.message);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "INVOICE_REFUNDED",
      targetEntity: "Invoice",
      targetId: invoice._id.toString(),
      details: {
        invoiceNumber: invoice.invoiceNumber,
        refundAmount: refAmt,
        refundReason,
        providerRefundId: refundOutcome.id,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { invoice, refundOutcome }, "Refund processed and audited successfully");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Expenses -----------------
async function createExpense(req, res, next) {
  try {
    const { title, category, amount, vendor, expenseDate, paymentMethod, receiptRef, notes } = req.body;
    const expAmt = roundToTwo(amount);

    if (!title || !category || !expAmt || !expenseDate) {
      return next(new ValidationError("Title, category, amount, and expense date are required"));
    }

    const expenseNumber = await generateExpenseNumber();
    const expense = await Expense.create({
      expenseNumber,
      title: title.trim(),
      category,
      amount: expAmt,
      vendor: vendor ? vendor.trim() : "",
      expenseDate,
      paymentMethod: paymentMethod || "bank_transfer",
      receiptRef: receiptRef ? receiptRef.trim() : "",
      notes: notes ? notes.trim() : "",
      status: "paid",
      recordedBy: req.user._id,
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "EXPENSE_RECORDED",
      targetEntity: "Expense",
      targetId: expense._id.toString(),
      details: { expenseNumber, category, amount: expAmt },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { expense }, "Expense record logged successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const { category, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        filter.$or = [{ title: regex }, { vendor: regex }, { expenseNumber: regex }];
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("recordedBy", "name role"),
      Expense.countDocuments(filter),
    ]);

    return sendSuccess(res, { expenses, total, page: parseInt(page, 10) }, "Expenses retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

// ----------------- Financial Reconciliation -----------------
async function getFinancialReconciliation(req, res, next) {
  try {
    const [invoices, expenses, payments] = await Promise.all([
      Invoice.find(),
      Expense.find(),
      Payment.find(),
    ]);

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDues = 0;
    let totalRefunds = 0;

    invoices.forEach((inv) => {
      totalBilled += inv.totalAmount || 0;
      totalCollected += inv.paidAmount || 0;
      if (inv.status === "pending" || inv.status === "partially_paid") {
        totalDues += inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount - (inv.paidAmount || 0);
      }
      if (inv.status === "refunded" && inv.refundDetails?.refundAmount) {
        totalRefunds += inv.refundDetails.refundAmount;
      }
    });

    let totalExpenses = 0;
    expenses.forEach((exp) => {
      totalExpenses += exp.amount || 0;
    });

    const netCashFlow = totalCollected - totalRefunds - totalExpenses;

    // Scan for actionable reconciliation discrepancies
    const discrepancies = [];
    const receipts = await Receipt.find().select("paymentId invoiceId");
    const receiptInvoiceIds = new Set(receipts.map((r) => r.invoiceId?.toString()));

    invoices.forEach((inv) => {
      // 1. Balance calculation mismatch
      const expectedBalance = roundToTwo(Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)));
      if (Math.abs((inv.balanceAmount || 0) - expectedBalance) > 0.01) {
        discrepancies.push({
          type: "BALANCE_MISMATCH",
          entityId: inv._id,
          reference: inv.invoiceNumber,
          details: `Recorded balance ₹${inv.balanceAmount} does not match expected ₹${expectedBalance}`,
          severity: "warning",
        });
      }

      // 2. Paid invoice missing receipt
      if ((inv.status === "paid" || inv.paidAmount > 0) && !receiptInvoiceIds.has(inv._id.toString())) {
        discrepancies.push({
          type: "MISSING_RECEIPT",
          entityId: inv._id,
          reference: inv.invoiceNumber,
          details: `Invoice has paid amount of ₹${inv.paidAmount} but no generated receipt exists`,
          severity: "high",
        });
      }
    });

    // 3. Stale pending payments older than 30 mins
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
    payments.forEach((p) => {
      if (p.status === "initiated" && p.createdAt < staleThreshold) {
        discrepancies.push({
          type: "STALE_PAYMENT_ATTEMPT",
          entityId: p._id,
          reference: p.paymentNumber,
          details: `Payment attempt of ₹${p.amount} initiated at ${p.createdAt} remains pending`,
          severity: "info",
        });
      }
    });

    const gatewayStats = {
      razorpayCaptured: payments.filter((p) => p.paymentProvider === "razorpay" && p.status === "success").length,
      razorpayPending: payments.filter((p) => p.paymentProvider === "razorpay" && p.status === "initiated").length,
      razorpayFailed: payments.filter((p) => p.paymentProvider === "razorpay" && p.status === "failed").length,
      offlineUpi: payments.filter((p) => p.paymentProvider !== "razorpay" && p.paymentMethod === "upi").length,
      cashOrPos: payments.filter((p) => ["cash", "card"].includes(p.paymentMethod)).length,
      reconciliationStatus: discrepancies.length === 0 ? "BALANCED" : "DISCREPANCIES_DETECTED",
      discrepanciesCount: discrepancies.length,
      discrepancies,
    };

    return sendSuccess(
      res,
      {
        reconciliation: {
          totalBilled: roundToTwo(totalBilled),
          totalCollected: roundToTwo(totalCollected),
          totalDues: roundToTwo(totalDues),
          totalRefunds: roundToTwo(totalRefunds),
          totalExpenses: roundToTwo(totalExpenses),
          netCashFlow: roundToTwo(netCashFlow),
          totalInvoicesCount: invoices.length,
          totalExpensesCount: expenses.length,
          totalPaymentsCount: payments.length,
          gatewayBreakdown: gatewayStats,
        },
      },
      "Financial reconciliation report computed from database records"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * Execute automated safe financial reconciliation & repair
 */
async function reconcileDiscrepancies(req, res, next) {
  try {
    const repairs = [];

    // 1. Recalculate balance for all invoices
    const invoices = await Invoice.find();
    for (const inv of invoices) {
      if (inv.status === "paid" && (!inv.paidAmount || inv.paidAmount === 0)) {
        inv.paidAmount = inv.totalAmount;
        inv.balanceAmount = 0;
        await inv.save();
        repairs.push({ type: "PAID_AMOUNT_SETTLED", invoiceNumber: inv.invoiceNumber, paidAmount: inv.totalAmount });
      }

      const expectedBalance = roundToTwo(Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)));
      if (Math.abs((inv.balanceAmount || 0) - expectedBalance) > 0.01) {
        inv.balanceAmount = expectedBalance;
        if (inv.paidAmount >= inv.totalAmount && inv.status !== "refunded") {
          inv.status = "paid";
        }
        await inv.save();
        repairs.push({ type: "BALANCE_REPAIRED", invoiceNumber: inv.invoiceNumber, newBalance: expectedBalance });
      }

      // 2. Ensure missing receipts are idempotently created for settled invoices
      if ((inv.status === "paid" || inv.paidAmount > 0) && inv.paidAmount > 0) {
        if (!inv.patientId && inv.orderId) {
          const Order = require("./order.model");
          const ord = await Order.findById(inv.orderId);
          if (ord?.patientId) {
            inv.patientId = ord.patientId;
            await inv.save();
          }
        }

        if (!inv.patientId) {
          continue;
        }

        const existingReceipt = await Receipt.findOne({ invoiceId: inv._id });
        if (!existingReceipt) {
          let payment = await Payment.findOne({ invoiceId: inv._id, status: "success" });
          if (!payment) {
            payment = await Payment.create({
              paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
              invoiceId: inv._id,
              patientId: inv.patientId,
              amount: inv.paidAmount,
              currency: inv.currency || "INR",
              paymentMethod: inv.paymentMethod !== "none" ? inv.paymentMethod : "upi",
              paymentProvider: "manual_pos",
              status: "success",
              paidAt: inv.paidAt || inv.createdAt || new Date(),
              recordedBy: req.user._id,
              notes: "Auto-generated during reconciliation",
            });
          }
          const rec = await createReceiptForPayment({
            payment,
            invoice: inv,
            appointmentId: inv.appointmentId,
            doctorId: inv.doctorId,
          });
          repairs.push({ type: "RECEIPT_GENERATED", invoiceNumber: inv.invoiceNumber, receiptNumber: rec.receiptNumber });
        }
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "FINANCIAL_RECONCILIATION_EXECUTED",
      targetEntity: "Invoice",
      details: { repairsCount: repairs.length, repairs },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { repairsCount: repairs.length, repairs }, "Financial reconciliation repair executed successfully");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoiceById,
  downloadInvoicePdf,
  createInvoice,
  recordPayment,
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  processRefund,
  createExpense,
  listExpenses,
  getFinancialReconciliation,
  reconcileDiscrepancies,
};

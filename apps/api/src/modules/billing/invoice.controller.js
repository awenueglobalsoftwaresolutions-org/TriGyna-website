const mongoose = require("mongoose");
const crypto = require("crypto");
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
} = require("./billing.service");
const { generateReceiptPdf } = require("./receipt-pdf.service");

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

    if (["crm", "hrms"].includes(req.user.role)) {
      return next(new ForbiddenError("Access denied: You are not authorized to view financial invoices"));
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

    if (search) {
      filter.invoiceNumber = new RegExp(search.trim(), "i");
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

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      doctorId: doctorId || undefined,
      appointmentId: appointmentId || undefined,
      items: calc.items,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      taxableAmount: calc.taxableAmount,
      taxRate: Number(taxRate) || 0,
      taxAmount: finalTaxAmount,
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
 * Payment Gateway: Create order for online payment (e.g. UPI / PhonePe / Razorpay)
 */
async function createPaymentOrder(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return next(new NotFoundError("Invoice not found"));

    if (invoice.status === "paid") {
      return next(new ValidationError("Invoice is already fully paid"));
    }

    const currentBalance = roundToTwo(invoice.totalAmount - (invoice.paidAmount || 0));
    const payableAmount = req.body.amount ? Math.min(currentBalance, roundToTwo(req.body.amount)) : currentBalance;

    const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const paymentInitiation = await Payment.create({
      paymentNumber: `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      amount: payableAmount,
      currency: invoice.currency || "INR",
      paymentMethod: req.body.paymentMethod || "upi",
      paymentProvider: req.body.provider || "phonepe",
      providerTransactionId: orderId,
      status: "initiated",
      notes: `Order created for invoice ${invoice.invoiceNumber}`,
    });

    return sendSuccess(
      res,
      {
        orderId,
        paymentId: paymentInitiation._id,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: payableAmount,
        currency: invoice.currency || "INR",
        provider: req.body.provider || "phonepe",
      },
      "Gateway payment order initialized"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * Payment Gateway: Verify client payment outcome and issue receipt
 */
async function verifyPayment(req, res, next) {
  try {
    const { paymentId, providerTransactionId, providerSignature, status = "success" } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return next(new NotFoundError("Payment transaction not found"));
    }

    if (payment.status === "success") {
      const receipt = await Receipt.findOne({ paymentId: payment._id });
      return sendSuccess(res, { payment, receipt }, "Payment already verified");
    }

    if (status !== "success") {
      payment.status = "failed";
      await payment.save();
      return sendSuccess(res, { payment, status: "failed" }, "Payment marked failed");
    }

    payment.status = "success";
    payment.paidAt = new Date();
    payment.providerTransactionId = providerTransactionId || payment.providerTransactionId;
    await payment.save();

    const invoice = await Invoice.findById(payment.invoiceId);
    invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + payment.amount);
    invoice.balanceAmount = roundToTwo(invoice.totalAmount - invoice.paidAmount);
    invoice.status = invoice.balanceAmount <= 0 ? "paid" : "partially_paid";
    invoice.paidAt = new Date();
    invoice.paymentMethod = payment.paymentMethod;

    const receipt = await createReceiptForPayment({
      payment,
      invoice,
      appointmentId: invoice.appointmentId,
      doctorId: invoice.doctorId,
    });

    invoice.payments.push({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentProvider: payment.paymentProvider,
      transactionRef: payment.providerTransactionId,
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      recordedAt: new Date(),
      notes: "Online gateway verification",
    });

    await invoice.save();

    return sendSuccess(res, { payment, receipt, invoice }, "Payment verified and receipt issued successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * Payment Gateway Webhook handler (Idempotent processing)
 */
async function handlePaymentWebhook(req, res, next) {
  try {
    const { event, payload } = req.body;
    const providerTxnId = payload?.payment?.id || payload?.transactionId;

    if (!providerTxnId) {
      return sendSuccess(res, { received: true }, "Webhook received without transaction identifier");
    }

    // Check if already processed
    const existing = await Payment.findOne({ providerTransactionId: providerTxnId, status: "success" });
    if (existing) {
      return sendSuccess(res, { received: true, idempotent: true }, "Webhook already processed");
    }

    if (event === "payment.captured" || event === "payment.success") {
      const payment = await Payment.findOne({ providerTransactionId: providerTxnId });
      if (payment) {
        payment.status = "success";
        payment.paidAt = new Date();
        await payment.save();

        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + payment.amount);
          invoice.balanceAmount = roundToTwo(invoice.totalAmount - invoice.paidAmount);
          invoice.status = invoice.balanceAmount <= 0 ? "paid" : "partially_paid";
          const receipt = await createReceiptForPayment({ payment, invoice });
          await invoice.save();
        }
      }
    }

    return sendSuccess(res, { received: true }, "Webhook processed successfully");
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

    invoice.status = "refunded";
    invoice.refundDetails = {
      refundAmount: refAmt,
      refundReason: refundReason.trim(),
      refundedAt: new Date(),
      refundedBy: req.user._id,
    };

    await invoice.save();

    // Mark corresponding receipts as refunded
    await Receipt.updateMany({ invoiceId: invoice._id }, { status: "refunded" });

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
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { invoice }, "Refund processed and audited successfully");
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
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { vendor: regex }, { expenseNumber: regex }];
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
    const [invoices, expenses] = await Promise.all([
      Invoice.find(),
      Expense.find(),
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
        },
      },
      "Financial reconciliation report computed from database records"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoiceById,
  createInvoice,
  recordPayment,
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  processRefund,
  createExpense,
  listExpenses,
  getFinancialReconciliation,
};

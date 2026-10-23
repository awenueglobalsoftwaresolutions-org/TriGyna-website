const Invoice = require("./invoice.model");
const Expense = require("./expense.model");
const Patient = require("../patients/patient.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");

// Helper to generate invoice number
async function generateInvoiceNumber() {
  const count = await Invoice.countDocuments();
  const year = new Date().getFullYear();
  return `INV-${year}-${1000 + count + 1}`;
}

// Helper to generate expense number
async function generateExpenseNumber() {
  const count = await Expense.countDocuments();
  const year = new Date().getFullYear();
  return `EXP-${year}-${1000 + count + 1}`;
}

async function listInvoices(req, res, next) {
  try {
    const { status, search, patientId, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    // Patient role can only view their own invoices
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!patient) {
        return sendSuccess(res, { invoices: [], total: 0 }, "No invoices found for patient");
      }
      filter.patientId = patient._id;
    }

    if (search) {
      filter.invoiceNumber = new RegExp(search.trim(), "i");
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("patientId", "patientCode fullName phone")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
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
      .populate("refundDetails.refundedBy", "name role");

    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
    }

    if (req.user.role === "patient") {
      const patient = await Patient.findOne({
        $or: [
          { userId: req.user._id },
          ...(req.user.phone ? [{ phone: req.user.phone }] : []),
          ...(req.user.email ? [{ email: req.user.email.toLowerCase() }] : []),
        ],
      });
      if (!patient || invoice.patientId._id.toString() !== patient._id.toString()) {
        return next(new ForbiddenError("Access denied: You can only view your own invoices"));
      }
    }

    return sendSuccess(res, { invoice }, "Invoice details retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

async function createInvoice(req, res, next) {
  try {
    const { patientId, doctorId, appointmentId, items, taxAmount = 0, notes } = req.body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return next(new ValidationError("Patient ID and at least one line item are required"));
    }

    // Backend calculation of line items and totalAmount (never trust browser sum)
    let calculatedSubtotal = 0;
    const validatedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const amt = Number(item.amount) || 0;
      calculatedSubtotal += amt * qty;
      return {
        description: item.description.trim(),
        amount: amt,
        quantity: qty,
      };
    });

    const parsedTax = Number(taxAmount) || 0;
    const totalAmount = calculatedSubtotal + parsedTax;
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      doctorId: doctorId || undefined,
      appointmentId: appointmentId || undefined,
      items: validatedItems,
      taxAmount: parsedTax,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: "pending",
      notes: notes ? notes.trim() : "",
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "INVOICE_CREATED",
      targetEntity: "Invoice",
      targetId: invoice._id.toString(),
      details: { invoiceNumber, totalAmount, patientId },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { invoice }, "Invoice generated successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function recordPayment(req, res, next) {
  try {
    const { amount, paymentMethod = "upi", transactionRef, notes } = req.body;
    const paymentAmt = Number(amount);

    if (!paymentAmt || paymentAmt <= 0) {
      return next(new ValidationError("A valid payment amount greater than 0 is required"));
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

    const currentBalance = invoice.totalAmount - (invoice.paidAmount || 0);
    if (paymentAmt > currentBalance) {
      return next(new ValidationError(`Payment amount (${paymentAmt}) exceeds outstanding balance (${currentBalance})`));
    }

    invoice.payments.push({
      amount: paymentAmt,
      paymentMethod,
      transactionRef: transactionRef ? transactionRef.trim() : "",
      notes: notes ? notes.trim() : "",
      recordedBy: req.user._id,
      recordedAt: new Date(),
    });

    invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmt;
    invoice.balanceAmount = invoice.totalAmount - invoice.paidAmount;

    if (invoice.balanceAmount <= 0) {
      invoice.status = "paid";
      invoice.paidAt = new Date();
      invoice.paymentMethod = paymentMethod;
    } else {
      invoice.status = "partially_paid";
    }

    await invoice.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYMENT_RECORDED",
      targetEntity: "Invoice",
      targetId: invoice._id.toString(),
      details: {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmt,
        paymentMethod,
        remainingBalance: invoice.balanceAmount,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { invoice }, "Payment successfully recorded and balance updated");
  } catch (err) {
    return next(err);
  }
}

async function processRefund(req, res, next) {
  try {
    const { refundAmount, refundReason } = req.body;
    const refAmt = Number(refundAmount);

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
    const expAmt = Number(amount);

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
          totalBilled,
          totalCollected,
          totalDues,
          totalRefunds,
          totalExpenses,
          netCashFlow,
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
  processRefund,
  createExpense,
  listExpenses,
  getFinancialReconciliation,
};

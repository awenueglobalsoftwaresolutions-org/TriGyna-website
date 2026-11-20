const Payment = require("./payment.model");
const Invoice = require("./invoice.model");
const Order = require("./order.model");
const Receipt = require("./receipt.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const { sendSuccess } = require("../../shared/response");
const { NotFoundError, ForbiddenError, ValidationError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { roundToTwo, createReceiptForPayment } = require("./billing.service");
const { safeRegex } = require("../../shared/regex.utils");

// Helper to resolve patient
async function resolvePatientForUser(user) {
  let patient = await Patient.findOne({ userId: user._id });
  if (!patient && (user.email || user.phone)) {
    patient = await Patient.findOne({
      $or: [
        ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
        ...(user.phone ? [{ phone: user.phone }] : []),
      ],
    });
  }
  return patient;
}

/**
 * GET /api/v1/payments (or /api/v1/admin/payments) — List Payments
 */
async function listPayments(req, res, next) {
  try {
    const {
      status,
      paymentMethod,
      paymentProvider,
      patientId,
      doctorId,
      orderId,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      if (!myPatient) {
        return sendSuccess(res, { payments: [], total: 0 }, "No payments found for patient");
      }
      filter.patientId = myPatient._id;
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return next(new ForbiddenError("Doctor profile not found"));
      }
      filter.doctorId = doctor._id;
    } else {
      if (status) filter.status = status;
      if (paymentMethod) filter.paymentMethod = paymentMethod;
      if (paymentProvider) filter.paymentProvider = paymentProvider;
      if (patientId) filter.patientId = patientId;
      if (doctorId) filter.doctorId = doctorId;
      if (orderId) filter.orderId = orderId;
    }

    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        filter.$or = [
          { paymentNumber: regex },
          { providerTransactionId: regex },
          { providerOrderId: regex },
        ];
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("patientId", "patientCode fullName phone email")
        .populate({
          path: "doctorId",
          populate: { path: "userId", select: "name" },
        })
        .populate("invoiceId", "invoiceNumber totalAmount paidAmount balanceAmount status")
        .populate("orderId", "orderNumber serviceName orderStatus paymentStatus")
        .populate("receiptId", "receiptNumber verificationToken issuedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Payment.countDocuments(filter),
    ]);

    return sendSuccess(res, { payments, total, page: parseInt(page, 10) }, "Payments list retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/payments/:id — Get Single Payment
 */
async function getPaymentById(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("patientId", "patientCode fullName phone email")
      .populate({
        path: "doctorId",
        populate: { path: "userId", select: "name" },
      })
      .populate("invoiceId")
      .populate("orderId")
      .populate("receiptId");

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      if (!myPatient || payment.patientId?._id.toString() !== myPatient._id.toString()) {
        throw new ForbiddenError("Access denied to this payment record");
      }
    }

    return sendSuccess(res, { payment }, "Payment record retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/admin/payments/:id/reconcile — Controlled Individual Payment Reconciliation
 */
async function reconcilePayment(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    let invoice = payment.invoiceId ? await Invoice.findById(payment.invoiceId) : null;
    let order = payment.orderId ? await Order.findById(payment.orderId) : null;
    let receipt = payment.receiptId ? await Receipt.findById(payment.receiptId) : null;
    const actionsTaken = [];

    // Reconcile Invoice if linked
    if (invoice && payment.status === "success") {
      const verifiedPayments = await Payment.find({ invoiceId: invoice._id, status: "success" });
      const sumPaid = roundToTwo(verifiedPayments.reduce((acc, p) => acc + (p.amount || 0), 0));
      const expectedBalance = roundToTwo(Math.max(0, invoice.totalAmount - sumPaid));

      if (invoice.paidAmount !== sumPaid || invoice.balanceAmount !== expectedBalance) {
        invoice.paidAmount = sumPaid;
        invoice.balanceAmount = expectedBalance;
        if (expectedBalance <= 0 && invoice.status !== "refunded") {
          invoice.status = "paid";
        } else if (sumPaid > 0 && expectedBalance > 0) {
          invoice.status = "partially_paid";
        }
        await invoice.save();
        actionsTaken.push(`Invoice ${invoice.invoiceNumber} balance corrected: Paid ₹${sumPaid}, Balance ₹${expectedBalance}`);
      }

      // Check missing receipt
      if (!receipt) {
        receipt = await Receipt.findOne({ paymentId: payment._id });
        if (!receipt) {
          receipt = await createReceiptForPayment({ payment, invoice });
          payment.receiptId = receipt._id;
          await payment.save();
          actionsTaken.push(`Receipt ${receipt.receiptNumber} generated idempotently`);
        }
      }
    }

    // Reconcile Order if linked
    if (order && payment.status === "success") {
      if (order.orderStatus !== "paid") {
        order.orderStatus = "paid";
        order.paymentStatus = "success";
        order.paidAmount = order.totalAmount;
        order.balanceDue = 0;
        if (receipt) order.receiptId = receipt._id;
        await order.save();
        actionsTaken.push(`Order ${order.orderNumber} status updated to paid`);
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYMENT_RECONCILED",
      targetEntity: "Payment",
      targetId: payment._id.toString(),
      details: { paymentNumber: payment.paymentNumber, actionsTaken },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        payment,
        invoice,
        order,
        receipt,
        reconciled: true,
        actionsTaken,
      },
      actionsTaken.length > 0 ? "Payment reconciled and repairs applied" : "Payment is fully balanced and reconciled"
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPayments,
  getPaymentById,
  reconcilePayment,
};


const Payment = require("./payment.model");
const Invoice = require("./invoice.model");
const Order = require("./order.model");
const Receipt = require("./receipt.model");
const PaymentLink = require("./payment-link.model");
const PaymentTransaction = require("./payment-transaction.model");
const Patient = require("../patients/patient.model");
const Doctor = require("../doctors/doctor.model");
const NotificationLog = require("../notifications/notification-log.model");
const emailService = require("../notifications/email.service");
const whatsappService = require("../integrations/whatsapp.service");
const razorpayService = require("./razorpay.service");
const { sendSuccess } = require("../../shared/response");
const { NotFoundError, ForbiddenError, ValidationError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const { roundToTwo, createReceiptForPayment, recordLedgerEntry } = require("./billing.service");
const { safeRegex } = require("../../shared/regex.utils");
const env = require("../../config/env");

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
 * GET /api/v1/payments — List Payments
 */
async function listPayments(req, res, next) {
  try {
    const {
      status,
      paymentStatus,
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
      if (paymentStatus) {
        filter.paymentStatus = paymentStatus.toUpperCase();
      } else if (status) {
        filter.$or = [{ status }, { paymentStatus: status.toUpperCase() }];
      }
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
          { paymentReference: regex },
          { providerTransactionId: regex },
          { razorpayPaymentId: regex },
          { providerOrderId: regex },
          { razorpayOrderId: regex },
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
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Payment.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      { payments, total, page: parseInt(page, 10) },
      "Payments list retrieved successfully"
    );
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
      .populate("receiptId")
      .populate("createdBy", "name email role");

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      if (!myPatient || payment.patientId?._id.toString() !== myPatient._id.toString()) {
        throw new ForbiddenError("Access denied to this payment record");
      }
    }

    // Attach latest transactions for full FinTech audit trail
    const transactions = await PaymentTransaction.find({
      $or: [{ paymentId: payment._id }, { razorpayPaymentId: payment.razorpayPaymentId }],
    }).sort({ createdAt: -1 });

    return sendSuccess(res, { payment, transactions }, "Payment record retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/payments/:id/status — Payment Status Query
 */
async function getPaymentStatus(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("invoiceId", "invoiceNumber totalAmount paidAmount balanceAmount status")
      .populate("receiptId", "receiptNumber verificationToken issuedAt");

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    return sendSuccess(
      res,
      {
        paymentId: payment._id,
        paymentNumber: payment.paymentNumber,
        paymentReference: payment.paymentReference || payment.paymentNumber,
        paymentStatus: payment.paymentStatus,
        status: payment.status,
        amount: payment.amount,
        amountPaid: payment.amountPaid,
        amountDue: payment.amountDue,
        currency: payment.currency,
        razorpayPaymentId: payment.razorpayPaymentId || payment.providerTransactionId,
        razorpayOrderId: payment.razorpayOrderId || payment.providerOrderId,
        paidAt: payment.paidAt,
        invoice: payment.invoiceId,
        receipt: payment.receiptId,
      },
      "Payment status retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/payments/:id/resend-link — Resend Payment Link via Email and WhatsApp
 */
async function resendPaymentLink(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("patientId")
      .populate("invoiceId")
      .populate("orderId");

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (payment.paymentStatus === "PAID" || payment.status === "success") {
      throw new ConflictError("Payment has already been completed. No link needed.");
    }

    const patient = payment.patientId;
    const invoice = payment.invoiceId;
    const order = payment.orderId;

    const frontendBase = env.FRONTEND_ORIGIN || "http://localhost:3000";
    const checkoutRef = order?.checkoutToken || payment.paymentReference || payment._id.toString();
    const checkoutUrl = `${frontendBase}/payment/${checkoutRef}`;

    const customerPhone = patient?.phone || order?.customerPhone;
    const customerEmail = patient?.email || order?.customerEmail;
    const customerName = patient?.fullName || order?.customerName || "Valued Patient";
    const serviceName = order?.serviceName || `Invoice ${invoice?.invoiceNumber || ""}`;

    const dispatchResults = { email: null, whatsapp: null };

    if (customerEmail) {
      try {
        dispatchResults.email = await emailService.sendTemplateEmail({
          to: customerEmail,
          templateId: "payment_link_dispatch",
          data: {
            customerName,
            serviceName,
            amount: payment.amountDue || payment.amount,
            checkoutUrl,
          },
          patientId: patient?._id,
          invoiceId: invoice?._id,
          paymentId: payment._id,
        });
      } catch (e) {
        dispatchResults.email = { success: false, error: e.message };
      }
    }

    if (customerPhone) {
      try {
        const text = `Hello ${customerName},\n\nYour TriGyna service invoice has been generated.\n\nInvoice Number: ${invoice?.invoiceNumber || "N/A"}\nService: ${serviceName}\nTotal Bill: ₹${invoice?.totalAmount || payment.amount}\nPreviously Paid: ₹${invoice?.paidAmount || 0}\nRemaining Amount: ₹${payment.amountDue || payment.amount}\n\nYou can securely complete your payment using the link below:\n${checkoutUrl}\n\nThank you,\nTeam TriGyna`;

        dispatchResults.whatsapp = await whatsappService.sendTextMessage({
          to: customerPhone,
          text,
          patientId: patient?._id,
          idempotencyKey: `plink_resend_${payment._id}_${Date.now()}`,
          initiator: { type: "staff", userId: req.user._id, name: req.user.name },
        });
      } catch (e) {
        dispatchResults.whatsapp = { success: false, error: e.message };
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYMENT_LINK_RESENT",
      targetEntity: "Payment",
      targetId: payment._id.toString(),
      details: { checkoutUrl, dispatchResults },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { checkoutUrl, dispatchResults },
      "Payment link successfully resent to patient"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/payments/:id/reminder — Dispatch Payment Reminder Notification
 */
async function sendPaymentReminder(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("patientId")
      .populate("invoiceId")
      .populate("orderId");

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (payment.paymentStatus === "PAID" || payment.status === "success") {
      throw new ConflictError("Payment is already settled. Reminders are disabled for paid invoices.");
    }

    const patient = payment.patientId;
    const invoice = payment.invoiceId;
    const order = payment.orderId;

    const frontendBase = env.FRONTEND_ORIGIN || "http://localhost:3000";
    const checkoutRef = order?.checkoutToken || payment.paymentReference || payment._id.toString();
    const checkoutUrl = `${frontendBase}/payment/${checkoutRef}`;

    const customerPhone = patient?.phone || order?.customerPhone;
    const customerEmail = patient?.email || order?.customerEmail;
    const customerName = patient?.fullName || order?.customerName || "Patient";
    const serviceName = order?.serviceName || "Clinical Healthcare Service";

    const dispatchResults = { email: null, whatsapp: null };

    if (customerEmail) {
      try {
        dispatchResults.email = await emailService.sendEmail({
          to: customerEmail,
          templateId: "payment_reminder",
          templateData: {
            patientName: customerName,
            invoiceNumber: invoice?.invoiceNumber,
            serviceName,
            amount: payment.amount,
            remainingBalance: payment.amountDue || payment.amount,
            checkoutUrl,
          },
          patientId: patient?._id,
          invoiceId: invoice?._id,
          paymentId: payment._id,
        });
      } catch (e) {
        dispatchResults.email = { success: false, error: e.message };
      }
    }

    if (customerPhone) {
      try {
        const text = `Hello ${customerName},\n\nThis is a friendly reminder from TriGyna regarding your pending invoice #${invoice?.invoiceNumber || ""}.\n\nOutstanding Balance: ₹${payment.amountDue || payment.amount}\nService: ${serviceName}\n\nYou can complete your payment securely here:\n${checkoutUrl}\n\nThank you,\nTeam TriGyna`;

        dispatchResults.whatsapp = await whatsappService.sendTextMessage({
          to: customerPhone,
          text,
          patientId: patient?._id,
          idempotencyKey: `plink_reminder_${payment._id}_${Date.now()}`,
          initiator: { type: "staff", userId: req.user._id, name: req.user.name },
        });
      } catch (e) {
        dispatchResults.whatsapp = { success: false, error: e.message };
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "PAYMENT_REMINDER_SENT",
      targetEntity: "Payment",
      targetId: payment._id.toString(),
      details: { dispatchResults },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { dispatchResults, checkoutUrl },
      "Payment reminder sent successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/payments/initialize-checkout — Public Checkout Session Initializer
 */
async function initializeCheckoutPayment(req, res, next) {
  try {
    const { token, reference, paymentId } = req.body;
    const lookupRef = token || reference || paymentId;

    if (!lookupRef) {
      throw new ValidationError("Payment token or reference is required");
    }

    // Check Order by checkoutToken or orderNumber
    let order = await Order.findOne({
      $or: [{ checkoutToken: lookupRef }, { orderNumber: lookupRef }],
    })
      .populate("packageId")
      .populate("invoiceId");

    let invoice = null;
    let payment = null;

    if (order) {
      invoice = order.invoiceId ? await Invoice.findById(order.invoiceId) : null;
      payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 });
    } else {
      // Check Payment by paymentReference, paymentNumber, or ID
      payment = await Payment.findOne({
        $or: [
          { paymentReference: lookupRef },
          { paymentNumber: lookupRef },
          ...(lookupRef.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: lookupRef }] : []),
        ],
      })
        .populate("patientId")
        .populate("invoiceId")
        .populate("orderId");

      if (payment) {
        invoice = payment.invoiceId;
        order = payment.orderId;
      }
    }

    if (!order && !payment && !invoice) {
      throw new NotFoundError("Payment checkout session not found or link has expired");
    }

    const finalPayable = invoice
      ? invoice.balanceAmount || invoice.balanceDue
      : order
      ? order.balanceDue
      : payment.amountDue || payment.amount;

    const maskedPhone = (order?.customerPhone || payment?.patientId?.phone || "")
      .replace(/\D/g, "")
      .slice(-4)
      .padStart(10, "*");

    const maskedEmail = (order?.customerEmail || payment?.patientId?.email || "").replace(
      /^(.)(.*)(@.*)$/,
      (_, a, b, c) => `${a}${"*".repeat(Math.max(1, b.length))}${c}`
    );

    return sendSuccess(
      res,
      {
        valid: true,
        invoiceNumber: invoice?.invoiceNumber || "INV-TG",
        serviceName: order?.serviceName || "Clinical Care Protocol",
        serviceDescription: order?.items?.[0]?.details || "TriGyna Healthcare Care Session",
        customerName: order?.customerName || payment?.patientId?.fullName || "Valued Patient",
        customerPhoneMasked: maskedPhone,
        customerEmailMasked: maskedEmail,
        totalAmount: invoice?.totalAmount || order?.totalAmount || payment?.amount,
        amountPaid: invoice?.paidAmount || order?.paidAmount || 0,
        balanceDue: finalPayable,
        currency: "INR",
        isSettled: finalPayable <= 0,
        paymentStatus: finalPayable <= 0 ? "PAID" : "PENDING",
        razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      },
      "Checkout session initialized"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/payments/verify — Cryptographic Verification
 */
async function verifyPayment(req, res, next) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
      orderId,
    } = req.body;

    if (!razorpay_payment_id) {
      throw new ValidationError("Razorpay Payment ID is required for verification");
    }

    // Verify cryptographic signature if order_id and signature provided
    if (razorpay_order_id && razorpay_signature) {
      const isValid = razorpayService.verifyPaymentSignature({
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        throw new ValidationError("Cryptographic HMAC signature mismatch. Verification failed.");
      }
    }

    // Locate Payment document
    let payment = null;
    if (paymentId) {
      payment = await Payment.findById(paymentId);
    }
    if (!payment && razorpay_payment_id) {
      payment = await Payment.findOne({
        $or: [
          { razorpayPaymentId: razorpay_payment_id },
          { providerTransactionId: razorpay_payment_id },
          { providerOrderId: razorpay_order_id },
          { razorpayOrderId: razorpay_order_id },
        ],
      });
    }

    if (payment) {
      payment.status = "success";
      payment.paymentStatus = "PAID";
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.providerTransactionId = razorpay_payment_id;
      payment.paidAt = new Date();
      payment.amountPaid = payment.amount;
      payment.amountDue = 0;
      await payment.save();

      // Log PaymentTransaction
      await PaymentTransaction.create({
        paymentId: payment._id,
        invoiceId: payment.invoiceId,
        patientId: payment.patientId,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        amount: payment.amount,
        currency: "INR",
        status: "SUCCESS",
        paymentMethod: payment.paymentMethod || "razorpay",
        verifiedAt: new Date(),
      });

      // Update Invoice
      if (payment.invoiceId) {
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          invoice.paidAmount = roundToTwo((invoice.paidAmount || 0) + payment.amount);
          invoice.amountPaid = invoice.paidAmount;
          invoice.balanceAmount = roundToTwo(Math.max(0, invoice.totalAmount - invoice.paidAmount));
          invoice.balanceDue = invoice.balanceAmount;
          invoice.status = invoice.balanceAmount <= 0 ? "paid" : "partially_paid";
          invoice.invoiceStatus = invoice.status;
          invoice.paidAt = new Date();

          const receipt = await createReceiptForPayment({ payment, invoice });
          payment.receiptId = receipt._id;
          await payment.save();

          invoice.payments.push({
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            paymentProvider: "razorpay",
            transactionRef: razorpay_payment_id,
            receiptId: receipt._id,
            receiptNumber: receipt.receiptNumber,
            recordedAt: new Date(),
            notes: "Verified via server payment verification",
          });
          await invoice.save();

          // Dispatch confirmation email & whatsapp
          try {
            const patientUser = await Patient.findById(invoice.patientId).populate("userId");
            emailService.sendTemplateEmail({
              to: invoice.customerEmail || patientUser?.email,
              templateId: "payment_success",
              data: {
                patientName: invoice.customerName || patientUser?.name || "Patient",
                invoiceNumber: invoice.invoiceNumber,
                serviceName: invoice.serviceName || "Clinical Care Protocol",
                transactionId: razorpay_payment_id,
                amountPaid: payment.amount,
                remainingBalance: invoice.balanceDue,
                paymentStatus: "SUCCESSFUL",
              },
              patientId: invoice.patientId,
              invoiceId: invoice._id,
              paymentId: payment._id,
            }).catch(() => {});
          } catch {}
        }
      }
    }

    return sendSuccess(
      res,
      {
        verified: true,
        paymentId: payment?._id,
        status: "PAID",
        razorpayPaymentId: razorpay_payment_id,
      },
      "Payment successfully verified and records updated"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/payments/reconcile — Batch Financial Reconciliation Service
 */
async function reconcileAllPayments(req, res, next) {
  try {
    const recentPayments = await Payment.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("invoiceId");

    let scanned = 0;
    let reconciled = 0;
    let repaired = 0;
    const actionsTaken = [];

    for (const payment of recentPayments) {
      scanned++;
      const invoice = payment.invoiceId;

      if (invoice && payment.status === "success") {
        const verifiedPayments = await Payment.find({ invoiceId: invoice._id, status: "success" });
        const sumPaid = roundToTwo(verifiedPayments.reduce((acc, p) => acc + (p.amount || 0), 0));
        const expectedBalance = roundToTwo(Math.max(0, invoice.totalAmount - sumPaid));

        if (invoice.paidAmount !== sumPaid || invoice.balanceAmount !== expectedBalance) {
          invoice.paidAmount = sumPaid;
          invoice.amountPaid = sumPaid;
          invoice.balanceAmount = expectedBalance;
          invoice.balanceDue = expectedBalance;
          invoice.status = expectedBalance <= 0 ? "paid" : "partially_paid";
          invoice.invoiceStatus = invoice.status;
          await invoice.save();
          repaired++;
          actionsTaken.push(`Invoice ${invoice.invoiceNumber} adjusted: Paid ₹${sumPaid}, Due ₹${expectedBalance}`);
        } else {
          reconciled++;
        }

        // Check missing receipt
        if (!payment.receiptId) {
          const receipt = await Receipt.findOne({ paymentId: payment._id });
          if (!receipt) {
            const newReceipt = await createReceiptForPayment({ payment, invoice });
            payment.receiptId = newReceipt._id;
            await payment.save();
            repaired++;
            actionsTaken.push(`Generated missing Receipt ${newReceipt.receiptNumber} for Payment ${payment.paymentNumber}`);
          }
        }
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "BATCH_FINANCIAL_RECONCILIATION",
      targetEntity: "Payment",
      details: { scanned, reconciled, repaired, actionsCount: actionsTaken.length },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        scanned,
        reconciled,
        repaired,
        actionsTaken,
      },
      `Reconciliation complete: ${scanned} checked, ${repaired} repaired, ${reconciled} verified.`
    );
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
    if (invoice && (payment.status === "success" || payment.paymentStatus === "PAID")) {
      const verifiedPayments = await Payment.find({
        invoiceId: invoice._id,
        $or: [{ status: "success" }, { paymentStatus: "PAID" }],
      });
      const sumPaid = roundToTwo(verifiedPayments.reduce((acc, p) => acc + (p.amount || 0), 0));
      const expectedBalance = roundToTwo(Math.max(0, invoice.totalAmount - sumPaid));

      if (invoice.paidAmount !== sumPaid || invoice.balanceAmount !== expectedBalance) {
        invoice.paidAmount = sumPaid;
        invoice.amountPaid = sumPaid;
        invoice.balanceAmount = expectedBalance;
        invoice.balanceDue = expectedBalance;
        if (expectedBalance <= 0 && invoice.status !== "refunded") {
          invoice.status = "paid";
          invoice.invoiceStatus = "paid";
        } else if (sumPaid > 0 && expectedBalance > 0) {
          invoice.status = "partially_paid";
          invoice.invoiceStatus = "partially_paid";
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
    if (order && (payment.status === "success" || payment.paymentStatus === "PAID")) {
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
  getPaymentStatus,
  resendPaymentLink,
  sendPaymentReminder,
  initializeCheckoutPayment,
  verifyPayment,
  reconcilePayment,
  reconcileAllPayments,
};

const mongoose = require("mongoose");
const crypto = require("crypto");
const env = require("../../config/env");
const Order = require("./order.model");
const Invoice = require("./invoice.model");
const Payment = require("./payment.model");
const Receipt = require("./receipt.model");
const RefundRequest = require("./refund-request.model");
const Package = require("../packages/package.model");
const Patient = require("../patients/patient.model");
const Lead = require("../crm/lead.model");
const User = require("../users/user.model");
const { sendSuccess, sendError } = require("../../shared/response");
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");
const {
  roundToTwo,
  generateInvoiceNumber,
  createReceiptForPayment,
} = require("./billing.service");
const {
  generateAtomicOrderNumber,
  generateAtomicPatientCode,
  generateAtomicInvoiceNumber,
} = require("../../shared/counter.service");
const { safeRegex } = require("../../shared/regex.utils");
const razorpayService = require("./razorpay.service");
const { grantPackageEntitlement } = require("../packages/session-ledger.service");
const { dispatchNotificationEvent } = require("../notifications/notification.service");

// Helper: resolve or link patient profile for authenticated user
async function resolvePatientForUser(user) {
  let patient = await Patient.findOne({ userId: user._id });
  if (!patient && (user.email || user.phone)) {
    patient = await Patient.findOne({
      $or: [
        ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
        ...(user.phone ? [{ phone: user.phone }] : []),
      ],
    });
    if (patient && !patient.userId) {
      patient.userId = user._id;
      await patient.save();
    }
  }
  return patient;
}

/**
 * Standard TriGyna Services Catalog Reference
 */
const SERVICES_CATALOG = [
  {
    code: "TG-SRV-GM",
    name: "General Medicine Consultation",
    department: "General Medicine",
    durationMinutes: 30,
    baseFee: 500,
    consultationType: "both",
    description: "Comprehensive general health assessment, lifestyle evaluation, and medical guidance.",
  },
  {
    code: "TG-SRV-HOM",
    name: "Homoeopathic Consultation & Services",
    department: "Homoeopathy",
    durationMinutes: 45,
    baseFee: 800,
    consultationType: "both",
    description: "Constitutional homoeopathic case taking, holistic treatment, and tailored natural remedies.",
  },
  {
    code: "TG-SRV-SKIN",
    name: "Skin & Hair Issues Care",
    department: "Dermatology & Cosmetology",
    durationMinutes: 30,
    baseFee: 600,
    consultationType: "both",
    description: "Clinical evaluation of acne, alopecia, pigmentation, and chronic skin/hair conditions.",
  },
  {
    code: "TG-SRV-DIET",
    name: "Diet & Clinical Nutrition Consultation",
    department: "Nutrition",
    durationMinutes: 45,
    baseFee: 700,
    consultationType: "both",
    description: "Customized therapeutic nutrition plan, metabolic health, and weight management.",
  },
  {
    code: "TG-SRV-PCOD",
    name: "PCOD/PCOS Comprehensive Management",
    department: "Women's Wellness",
    durationMinutes: 45,
    baseFee: 1200,
    consultationType: "both",
    description: "Root-cause hormonal balance, menstrual regulation, fertility support, and dietary lifestyle coaching.",
  },
];

/**
 * POST /api/v1/orders — Create Server-Validated Order
 */
async function createOrder(req, res, next) {
  try {
    const {
      leadId,
      patientId: targetPatientId,
      packageId,
      serviceName,
      serviceCode,
      consultationMode = "Online Video Consultation",
      quantity = 1,
      discountAmount = 0,
      discountReason,
      notes,
    } = req.body;

    if (consultationMode && (consultationMode.toLowerCase().includes("clinic") || consultationMode.toLowerCase().includes("offline") || consultationMode.toLowerCase().includes("person"))) {
      throw new ValidationError("TriGyna operates exclusively as an Online Video Healthcare platform. In-clinic orders are not supported.");
    }

    const canonicalConsultationMode = "Online Video Consultation";

    let customerName = req.body.customerName;
    let customerPhone = req.body.customerPhone;
    let customerEmail = req.body.customerEmail;
    let resolvedPatientId = null;
    let resolvedUserId = null;
    let resolvedLead = null;

    // 1. Resolve Identity based on Actor
    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      if (!myPatient) {
        throw new ForbiddenError("No patient chart linked to your user account.");
      }
      resolvedPatientId = myPatient._id;
      resolvedUserId = req.user._id;
      customerName = myPatient.fullName;
      customerPhone = myPatient.phone;
      customerEmail = myPatient.email || req.user.email;
    } else {
      // Staff roles: sales, crm, admin, owner
      if (leadId) {
        resolvedLead = await Lead.findById(leadId);
        if (!resolvedLead) {
          throw new NotFoundError("CRM Lead not found");
        }
        customerName = customerName || resolvedLead.fullName;
        customerPhone = customerPhone || resolvedLead.phone;
        customerEmail = customerEmail || resolvedLead.email;
        if (resolvedLead.convertedPatientId) {
          resolvedPatientId = resolvedLead.convertedPatientId;
        }
      } else if (targetPatientId) {
        const pt = await Patient.findById(targetPatientId);
        if (!pt) {
          throw new NotFoundError("Patient chart not found");
        }
        resolvedPatientId = pt._id;
        resolvedUserId = pt.userId || null;
        customerName = customerName || pt.fullName;
        customerPhone = customerPhone || pt.phone;
        customerEmail = customerEmail || pt.email;
      }
    }

    if (!customerName || !customerPhone) {
      throw new ValidationError("Customer name and a valid phone number are required to create an order.");
    }

    // 2. Resolve Item & Approved Pricing Snapshot
    let orderItem = null;
    let orderServiceName = serviceName || "Healthcare Consultation";
    let orderTerms = {
      validityDays: 90,
      totalSessions: 1,
      cancellationPolicy: "Cancellations allowed up to 4 hours prior to scheduled consultation.",
      refundPolicy: "Full refund within 7 days if no session credits consumed, subject to management approval.",
    };

    if (packageId) {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        throw new NotFoundError("Selected package not found in catalog");
      }
      if (!pkg.isPublished && req.user.role === "patient") {
        throw new ValidationError("This package is currently not available for public checkout");
      }

      const unitPrice = roundToTwo(pkg.pricePaise / 100);
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const lineTotal = roundToTwo(unitPrice * qty);

      orderServiceName = pkg.name;
      orderTerms.validityDays = pkg.validityDays || 90;
      orderTerms.totalSessions = pkg.totalSessions || 1;

      orderItem = {
        packageId: pkg._id,
        description: pkg.name,
        details: pkg.description || `Includes ${pkg.totalSessions} sessions (${pkg.sessionDurationMinutes || 30} mins each).`,
        unitPrice,
        quantity: qty,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        amount: lineTotal,
        totalSessions: pkg.totalSessions,
        validityDays: pkg.validityDays,
      };
    } else {
      // Single Service lookup
      const foundSrv =
        SERVICES_CATALOG.find((s) => s.code === serviceCode || s.name.toLowerCase() === (serviceName || "").toLowerCase()) ||
        SERVICES_CATALOG[0];

      const unitPrice = roundToTwo(foundSrv.baseFee);
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const lineTotal = roundToTwo(unitPrice * qty);

      orderServiceName = foundSrv.name;
      orderItem = {
        description: foundSrv.name,
        details: foundSrv.description,
        unitPrice,
        quantity: qty,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        amount: lineTotal,
        totalSessions: 1,
        validityDays: 30,
      };
    }

    // 3. Discount & Tax Authorization Rules
    const subtotal = roundToTwo(orderItem.amount);
    let authorizedDiscount = Math.max(0, roundToTwo(discountAmount));

    // Cap sales executive discount at 20% without explicit admin/owner authorization
    if (authorizedDiscount > 0) {
      const maxPermitted = roundToTwo(subtotal * 0.2);
      if (!["owner", "admin"].includes(req.user.role) && authorizedDiscount > maxPermitted) {
        throw new ForbiddenError(
          `Sales executives may apply discounts up to 20% (₹${maxPermitted}). Discounts above require Admin approval.`
        );
      }
    }

    const taxableAmount = Math.max(0, roundToTwo(subtotal - authorizedDiscount));
    const taxRate = 0; // Clinical healthcare consultations are tax-exempt in India
    const taxAmount = roundToTwo(taxableAmount * (taxRate / 100));
    const totalAmount = roundToTwo(taxableAmount + taxAmount);
    const balanceDue = totalAmount;

    // 4. Generate Unique Atomic Order Reference
    const orderNumber = await generateAtomicOrderNumber();
    const checkoutToken = crypto.randomBytes(24).toString("hex");

    // 5. Create Order Record
    const order = await Order.create({
      orderNumber,
      leadId: resolvedLead ? resolvedLead._id : undefined,
      patientId: resolvedPatientId || undefined,
      userId: resolvedUserId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : undefined,
      packageId: packageId || undefined,
      serviceName: orderServiceName,
      consultationMode: canonicalConsultationMode,
      items: [orderItem],
      subtotal,
      discountAmount: authorizedDiscount,
      discountReason: discountReason ? discountReason.trim() : "",
      discountApprovedBy: authorizedDiscount > 0 ? req.user._id : undefined,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balanceDue,
      currency: "INR",
      orderStatus: "pending_payment",
      paymentStatus: "pending",
      checkoutToken,
      checkoutExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      terms: orderTerms,
      salesExecutiveId: req.user.role === "sales" ? req.user._id : undefined,
      createdBy: req.user._id,
      notes: notes ? notes.trim() : "",
      history: [
        {
          action: "ORDER_CREATED",
          toStatus: "pending_payment",
          performedBy: req.user._id,
          timestamp: new Date(),
          notes: `Created by ${req.user.name || req.user.email} (${req.user.role})`,
        },
      ],
    });

    // 6. Automatically Provision Linked Official Pending Invoice
    const invoiceNumber = await generateAtomicInvoiceNumber("INV");
    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
      patientId: resolvedPatientId || undefined,
      leadId: resolvedLead ? resolvedLead._id : undefined,
      currency: "INR",
      subtotal,
      discountAmount: authorizedDiscount,
      taxableAmount,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: "pending",
      items: [
        {
          description: orderItem.description,
          details: orderItem.details,
          unitPrice: orderItem.unitPrice,
          quantity: orderItem.quantity,
          discountAmount: authorizedDiscount,
          taxRate: 0,
          taxAmount: 0,
          amount: totalAmount,
        },
      ],
      payments: [],
      notes: `Generated for Order ${order.orderNumber}`,
      createdBy: req.user._id,
    });

    order.invoiceId = invoice._id;
    try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }

    // 7. Update CRM Lead Pipeline if linked
    if (resolvedLead) {
      if (["new", "contacted", "interested", "assigned", "qualified", "package_discussion"].includes(resolvedLead.status)) {
        resolvedLead.status = "awaiting_payment";
      }
      resolvedLead.notes.push({
        body: `Order ${order.orderNumber} generated for ${order.serviceName} - Total: ₹${order.totalAmount}. Secure checkout link created.`,
        createdBy: req.user._id,
        createdAt: new Date(),
      });
      resolvedLead.activities.push({
        action: "ORDER_CREATED",
        details: `Generated Order ${order.orderNumber} (₹${order.totalAmount})`,
        performedBy: req.user._id,
        createdAt: new Date(),
      });
      await resolvedLead.save();
    }

    // 8. Dispatch notification event
    try {
      await dispatchNotificationEvent("order.created", {
        order,
        invoice,
        checkoutUrl: `${env.FRONTEND_ORIGIN || "http://localhost:3000"}/checkout/${order.checkoutToken}`,
      });
    } catch (notifErr) {
      console.warn("[Order] Notification dispatch warning:", notifErr.message);
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "ORDER_CREATED",
      targetEntity: "Order",
      targetId: order._id.toString(),
      details: { orderNumber: order.orderNumber, totalAmount: order.totalAmount, leadId },
      ipAddress: req.ip,
    });

    // 9. Generate Official Razorpay Payment Link
    try {
      const rzpLink = await razorpayService.createPaymentLink({
        amountRupees: order.balanceDue,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        description: `${order.serviceName} (${order.orderNumber})`,
        referenceId: order.orderNumber,
        notes: {
          orderNumber: order.orderNumber,
          leadId: resolvedLead ? resolvedLead._id.toString() : "",
          patientId: resolvedPatientId ? resolvedPatientId.toString() : "",
        },
      });

      if (rzpLink && rzpLink.id) {
        order.razorpayPaymentLinkId = rzpLink.id;
        if (rzpLink.short_url) {
          order.razorpayPaymentLinkUrl = rzpLink.short_url;
        }
        try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }
      }
    } catch (rzpLinkErr) {
      console.warn("[Order] Razorpay Payment Link generation notice:", rzpLinkErr.message);
    }

    const checkoutUrl = `${env.FRONTEND_ORIGIN || "http://localhost:3000"}/checkout/${order.checkoutToken}`;
    const paymentLink = order.razorpayPaymentLinkUrl || checkoutUrl;

    return sendSuccess(
      res,
      {
        order,
        invoice,
        invoiceNumber: invoice.invoiceNumber,
        checkoutToken: order.checkoutToken,
        checkoutUrl,
        paymentLink,
        razorpayPaymentLinkUrl: order.razorpayPaymentLinkUrl || null,
      },
      "Order created successfully with itemized pricing snapshot and payment link",
      201
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/orders — List Orders with RBAC & Filtering
 */
async function listOrders(req, res, next) {
  try {
    const { status, paymentStatus, search, leadId, patientId, salesExecutiveId, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      if (!myPatient) {
        return sendSuccess(res, { orders: [], total: 0 }, "No orders found");
      }
      filter.$or = [{ patientId: myPatient._id }, { userId: req.user._id }];
    } else {
      if (status) filter.orderStatus = status;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (leadId) filter.leadId = leadId;
      if (patientId) filter.patientId = patientId;
      if (salesExecutiveId) filter.salesExecutiveId = salesExecutiveId;
    }

    if (search && search.trim()) {
      const regex = safeRegex(search);
      if (regex) {
        filter.$or = [
          { orderNumber: regex },
          { customerName: regex },
          { customerPhone: regex },
          { serviceName: regex },
        ];
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("patientId", "patientCode fullName phone email")
        .populate("leadId", "fullName phone status")
        .populate("packageId", "name totalSessions validityDays")
        .populate("invoiceId", "invoiceNumber totalAmount balanceAmount status")
        .populate("receiptId", "receiptNumber verificationToken issuedAt")
        .populate("salesExecutiveId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Order.countDocuments(filter),
    ]);

    return sendSuccess(res, { orders, total, page: parseInt(page, 10) }, "Orders retrieved successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/orders/:id — Single Order Details (Scoped)
 */
async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("patientId", "patientCode fullName phone email")
      .populate("leadId", "fullName phone status")
      .populate("packageId")
      .populate("invoiceId")
      .populate("receiptId")
      .populate("entitlementId")
      .populate("salesExecutiveId", "name email");

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (req.user.role === "patient") {
      const myPatient = await resolvePatientForUser(req.user);
      const isOwner =
        (order.patientId && myPatient && order.patientId._id.toString() === myPatient._id.toString()) ||
        (order.userId && order.userId.toString() === req.user._id.toString());
      if (!isOwner) {
        throw new ForbiddenError("Access denied: You can only view your own orders");
      }
    }

    return sendSuccess(res, { order }, "Order details retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/orders/checkout/:token — Public Checkout Snapshot
 */
async function getPublicCheckoutOrder(req, res, next) {
  try {
    const { token } = req.params;
    const order = await Order.findOne({ checkoutToken: token })
      .populate("packageId", "name description totalSessions sessionDurationMinutes features")
      .populate("invoiceId", "invoiceNumber status totalAmount balanceAmount");

    if (!order) {
      throw new NotFoundError("Invalid or expired checkout link");
    }

    const isExpired = order.checkoutExpiresAt && new Date(order.checkoutExpiresAt) < new Date();
    if (isExpired && order.orderStatus === "pending_payment") {
      order.orderStatus = "expired";
      try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }
    }

    return sendSuccess(
      res,
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        serviceName: order.serviceName,
        customerName: order.customerName,
        customerPhone: order.customerPhone.slice(-4).padStart(10, "*"),
        consultationMode: order.consultationMode,
        items: order.items,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        balanceDue: order.balanceDue,
        currency: order.currency,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        terms: order.terms,
        razorpayKeyId: env.RAZORPAY_KEY_ID || "rzp_test_trigyna",
        isExpired,
      },
      "Checkout order information loaded"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * Helper: Process Gateway Payment Attempt for an Order
 */
async function processPaymentAttempt(order) {
  if (order.orderStatus === "paid" || order.balanceDue <= 0) {
    throw new ConflictError("Order is already fully paid");
  }

  if (["cancelled", "expired"].includes(order.orderStatus)) {
    throw new ConflictError(`Cannot pay for order in '${order.orderStatus}' status`);
  }

  const amountPaise = Math.round(order.balanceDue * 100);
  const rzpOrder = await razorpayService.createOrder({
    amountRupees: order.balanceDue,
    receipt: order.orderNumber,
    notes: { orderNumber: order.orderNumber, customerPhone: order.customerPhone },
  });

  // Record payment attempt
  order.paymentAttempts.push({
    provider: "razorpay",
    providerOrderId: rzpOrder.id,
    amount: order.balanceDue,
    currency: "INR",
    status: "initiated",
    attemptedAt: new Date(),
  });
  order.paymentStatus = "initiated";
  try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }

  // Create or locate Payment document
  let payment = await Payment.findOne({ providerOrderId: rzpOrder.id });
  if (!payment) {
    const year = new Date().getFullYear();
    const count = await Payment.countDocuments();
    const paymentNumber = `PAY-${year}-${1000 + count + 1}`;

    payment = await Payment.create({
      paymentNumber,
      orderId: order._id,
      invoiceId: order.invoiceId,
      patientId: order.patientId || undefined,
      amount: order.balanceDue,
      currency: order.currency || "INR",
      paymentMethod: "upi",
      paymentProvider: "razorpay",
      providerOrderId: rzpOrder.id,
      status: "initiated",
    });
  }

  return {
    providerOrderId: rzpOrder.id,
    amount: order.balanceDue,
    amountPaise,
    currency: order.currency || "INR",
    keyId: env.RAZORPAY_KEY_ID || "rzp_test_trigyna",
    orderNumber: order.orderNumber,
  };
}

/**
 * Helper: Process Verified Payment for an Order (Signature check, Invoice, Receipt, Patient & Entitlements)
 */
async function processVerifyPayment(order, body, actor, clientIp) {
  const razorpay_order_id = body.razorpay_order_id || body.razorpayOrderId;
  const razorpay_payment_id = body.razorpay_payment_id || body.razorpayPaymentId;
  const razorpay_signature = body.razorpay_signature || body.razorpaySignature;
  const paymentMethod = body.paymentMethod || "upi";

  // 1. Cryptographic HMAC Verification
  const isDevelopment = env.NODE_ENV !== "production";
  const isMock = isDevelopment && body.isMock === true;

  if (!isMock) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ValidationError("Missing required payment verification parameters (order_id, payment_id, signature)");
    }

    const isValid = razorpayService.verifyPaymentSignature({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      throw new ValidationError("Payment signature verification failed. Cryptographic HMAC mismatch.");
    }
  }

  // 2. Idempotency Check: if order is already marked paid, return existing state
  const currentOrder = (await Order.findById(order._id)) || order;
  if (currentOrder.orderStatus === "paid" && currentOrder.receiptId) {
    const existingReceipt = await Receipt.findById(currentOrder.receiptId);
    return {
      order: currentOrder,
      receipt: existingReceipt,
      receiptNumber: existingReceipt?.receiptNumber || "RCP/CONFIRMED",
      receiptVerificationToken: existingReceipt?.verificationToken,
      idempotent: true,
    };
  }

  // 3. Mark/Create Payment Success Record
  let payment = await Payment.findOne({
    $or: [
      { providerOrderId: razorpay_order_id },
      { providerTransactionId: razorpay_payment_id },
      { orderId: order._id, status: "initiated" },
    ],
  });

  if (!payment) {
    const year = new Date().getFullYear();
    const count = await Payment.countDocuments();
    payment = await Payment.create({
      paymentNumber: `PAY-${year}-${1000 + count + 1}`,
      orderId: order._id,
      invoiceId: order.invoiceId,
      patientId: order.patientId || undefined,
      amount: order.balanceDue,
      amountPaid: order.balanceDue,
      amountDue: 0,
      currency: order.currency || "INR",
      paymentMethod,
      paymentProvider: "razorpay",
      providerOrderId: razorpay_order_id || `order_mock_${Date.now()}`,
      providerTransactionId: razorpay_payment_id || `pay_mock_${Date.now()}`,
      status: "success",
      paymentStatus: "PAID",
      paidAt: new Date(),
    });
  } else {
    payment.status = "success";
    payment.paymentStatus = "PAID";
    payment.amountPaid = payment.amount;
    payment.amountDue = 0;
    payment.paidAt = new Date();
    payment.paymentMethod = paymentMethod;
    payment.providerTransactionId = razorpay_payment_id || payment.providerTransactionId;
    await payment.save();
  }

  // 4. Update Invoice State
  const invoice = await Invoice.findById(order.invoiceId);
  if (invoice && invoice.status !== "paid") {
    invoice.paidAmount = invoice.totalAmount;
    invoice.balanceAmount = 0;
    invoice.status = "paid";
    invoice.paidAt = new Date();
    invoice.paymentMethod = paymentMethod;
    invoice.payments.push({
      amount: payment.amount,
      paymentMethod,
      paymentProvider: "razorpay",
      transactionRef: payment.providerTransactionId,
      recordedAt: new Date(),
      notes: `Verified payment for Order ${order.orderNumber}`,
    });
    try {
      await invoice.save();
    } catch (invSaveErr) {
      if (invSaveErr.name === "VersionError") {
        console.warn("[Order] Concurrent invoice update detected; proceeding safely");
      } else {
        throw invSaveErr;
      }
    }
  }

  // 5. Identity Resolution & Conversion Handover (Anti-Blind-Merge Guard)
  let assignedPatientId = order.patientId;

  if (!assignedPatientId && order.leadId) {
    const lead = await Lead.findById(order.leadId);
    if (lead) {
      const cleanPhone = lead.phone.replace(/[^0-9+]/g, "").trim();

      // Search for existing patient by phone
      const existingPatient = await Patient.findOne({
        $or: [{ phone: cleanPhone }, ...(lead.email ? [{ email: lead.email.toLowerCase() }] : [])],
      });

      if (existingPatient) {
        // ANTI-BLIND-MERGE: Check name match
        const existingName = existingPatient.fullName.toLowerCase().trim();
        const leadName = lead.fullName.toLowerCase().trim();

        if (existingName === leadName) {
          // Identity verified: Safe linking
          assignedPatientId = existingPatient._id;
        } else {
          // Different individual sharing phone (e.g. parent/child): DO NOT MERGE! Create new distinct chart
          const newCode = await generateAtomicPatientCode();
          const newPatient = await Patient.create({
            patientCode: newCode,
            fullName: lead.fullName,
            phone: cleanPhone,
            email: lead.email || undefined,
            gender: "female",
            age: 28,
            medicalHistory: `Created from converted Order ${order.orderNumber}`,
            allergies: ["None reported"],
          });
          assignedPatientId = newPatient._id;
        }
      } else {
        // No match: Create new Patient chart
        const newCode = await generateAtomicPatientCode();
        const newPatient = await Patient.create({
          patientCode: newCode,
          fullName: lead.fullName,
          phone: cleanPhone,
          email: lead.email || undefined,
          gender: "female",
          age: 28,
          medicalHistory: `Created from converted Order ${order.orderNumber}`,
          allergies: ["None reported"],
        });
        assignedPatientId = newPatient._id;
      }

      // Advance Lead Stage & Link
      lead.status = "converted";
      lead.convertedPatientId = assignedPatientId;
      lead.notes.push({
        body: `Lead converted to active patient chart following verified payment on Order ${order.orderNumber}.`,
        createdAt: new Date(),
      });
      lead.activities.push({
        action: "LEAD_CONVERTED",
        details: `Converted via verified payment on Order ${order.orderNumber}`,
        createdAt: new Date(),
      });
      await lead.save();
    }
  }

  // Safety fallback if neither patientId nor leadId resolved
  if (!assignedPatientId && (order.customerName || order.customerPhone)) {
    const newCode = await generateAtomicPatientCode();
    const newPatient = await Patient.create({
      patientCode: newCode,
      fullName: order.customerName || "Patient",
      phone: order.customerPhone || "9999999999",
      email: order.customerEmail || undefined,
      gender: "female",
      age: 28,
    });
    assignedPatientId = newPatient._id;
  }

  // Update cross-entity references before receipt generation
  if (assignedPatientId) {
    order.patientId = assignedPatientId;
    payment.patientId = assignedPatientId;
    await payment.save();
    if (invoice) {
      invoice.patientId = assignedPatientId;
      await invoice.save();
    }
  }

  // 6. Generate Official Receipt
  const receipt = await createReceiptForPayment({
    payment,
    invoice,
  });
  receipt.orderId = order._id;
  if (assignedPatientId) {
    receipt.patientId = assignedPatientId;
  }
  await receipt.save();

  // 7. Grant Package Entitlements if package order
  let entitlement = null;
  if (order.packageId && assignedPatientId) {
    try {
      entitlement = await grantPackageEntitlement({
        patientId: assignedPatientId,
        packageId: order.packageId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentId: payment.paymentNumber,
        actor,
      });
      order.entitlementId = entitlement._id;
    } catch (entErr) {
      console.warn("[Order] Entitlement grant warning:", entErr.message);
    }
  }

  // 8. Update Order Final Status
  order.orderStatus = "paid";
  order.paymentStatus = "success";
  order.paidAmount = order.totalAmount;
  order.balanceDue = 0;
  order.receiptId = receipt._id;
  order.history.push({
    action: "PAYMENT_VERIFIED",
    toStatus: "paid",
    performedBy: actor ? actor._id : undefined,
    timestamp: new Date(),
    notes: `Captured ₹${order.totalAmount} via ${paymentMethod} (${payment.providerTransactionId})`,
  });
  try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }

  // 9. Dispatch event notifications
  try {
    await dispatchNotificationEvent("payment.captured", {
      order,
      invoice,
      payment,
      receipt,
    });
    if (assignedPatientId) {
      await dispatchNotificationEvent("patient.onboarding_ready", {
        patientId: assignedPatientId,
        orderNumber: order.orderNumber,
      });
    }
  } catch (nErr) {
    console.warn("[Order] Post-payment notification error:", nErr.message);
  }

  return {
    order,
    receipt,
    receiptNumber: receipt.receiptNumber,
    receiptVerificationToken: receipt.verificationToken,
    entitlementId: order.entitlementId,
  };
}

/**
 * POST /api/v1/orders/:id/payment-attempts — Create Payment Attempt with Gateway (Authenticated)
 */
async function createOrderPaymentAttempt(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new NotFoundError("Order not found");
    }
    const result = await processPaymentAttempt(order);
    return sendSuccess(res, result, "Payment attempt created successfully with provider order");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/orders/checkout/:token/payment-attempts — Public Gateway Attempt via Token
 */
async function createCheckoutPaymentAttempt(req, res, next) {
  try {
    const { token } = req.params;
    const order = await Order.findOne({ checkoutToken: token });
    if (!order) {
      throw new NotFoundError("Invalid or expired checkout link");
    }
    const isExpired = order.checkoutExpiresAt && new Date(order.checkoutExpiresAt) < new Date();
    if (isExpired) {
      throw new ConflictError("This checkout link has expired. Please contact clinic to reissue.");
    }
    const result = await processPaymentAttempt(order);
    return sendSuccess(res, result, "Payment attempt created successfully with provider order");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/orders/:id/verify-payment — Cryptographic Signature Verification & Conversion (Authenticated)
 */
async function verifyOrderPayment(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new NotFoundError("Order not found");
    }
    const result = await processVerifyPayment(order, req.body, req.user, req.ip);
    return sendSuccess(res, result, "Payment verified successfully. Receipt and package entitlements generated.");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/orders/checkout/:token/verify-payment — Public Gateway Verification via Token
 */
async function verifyCheckoutPayment(req, res, next) {
  try {
    const { token } = req.params;
    const order = await Order.findOne({ checkoutToken: token });
    if (!order) {
      throw new NotFoundError("Invalid or expired checkout link");
    }
    const result = await processVerifyPayment(order, req.body, req.user || null, req.ip);
    return sendSuccess(res, result, "Payment verified successfully. Receipt and package entitlements generated.");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/patient/orders/:id/payment-status — Order & Payment Status Check
 */
async function getOrderPaymentStatus(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .select("orderNumber orderStatus paymentStatus totalAmount paidAmount balanceDue currency receiptId invoiceId updatedAt")
      .populate("receiptId", "receiptNumber verificationToken issuedAt");

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return sendSuccess(
      res,
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        balanceDue: order.balanceDue,
        currency: order.currency,
        receipt: order.receiptId,
        updatedAt: order.updatedAt,
      },
      "Payment status loaded"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/patient/orders/:id/refund-requests — Patient Order Refund Request
 */
async function createOrderRefundRequest(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ userId: req.user._id });
      const patientIdStr = patient ? patient._id.toString() : null;
      const orderPatientIdStr = order.patientId ? order.patientId.toString() : null;
      const orderUserIdStr = order.userId ? order.userId.toString() : null;

      if (
        (!patientIdStr || orderPatientIdStr !== patientIdStr) &&
        orderUserIdStr !== req.user._id.toString()
      ) {
        throw new ForbiddenError("You are not authorized to request refunds on this order.");
      }
    }

    if (order.orderStatus !== "paid") {
      throw new ValidationError("Only fully paid orders are eligible to request refunds.");
    }

    const { requestedAmount, reason, refundDestination } = req.body;
    const finalAmount = Number(requestedAmount) || order.totalAmount;

    if (!reason || !reason.trim()) {
      throw new ValidationError("Reason for refund request is required.");
    }

    if (finalAmount > order.paidAmount) {
      throw new ValidationError(`Refund amount cannot exceed verified paid amount of ₹${order.paidAmount}.`);
    }

    const refundNumber = `REF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const refund = await RefundRequest.create({
      refundNumber,
      orderId: order._id,
      invoiceId: order.invoiceId,
      patientId: order.patientId,
      requestedAmount: finalAmount,
      reason: reason.trim(),
      refundDestination: refundDestination ? refundDestination.trim() : "",
      status: "pending",
    });

    order.orderStatus = "partially_refunded";
    order.history.push({
      action: "REFUND_REQUESTED",
      toStatus: "partially_refunded",
      performedBy: req.user._id,
      timestamp: new Date(),
      notes: `Refund requested for ₹${finalAmount}. Reason: ${reason}`,
    });
    try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "REFUND_REQUEST_SUBMITTED",
      targetEntity: "Order",
      targetId: order._id.toString(),
      details: { refundNumber, requestedAmount: finalAmount, orderNumber: order.orderNumber },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { refundRequest: refund },
      "Refund request submitted successfully for management review",
      201
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/admin/refunds — List all refund requests
 */
async function listRefundRequests(req, res, next) {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [refunds, total] = await Promise.all([
      RefundRequest.find(filter)
        .populate("patientId", "patientCode fullName phone email")
        .populate("orderId", "orderNumber totalAmount paidAmount orderStatus")
        .populate("invoiceId", "invoiceNumber totalAmount paidAmount status")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      RefundRequest.countDocuments(filter),
    ]);

    return sendSuccess(res, { refunds, total, page: parseInt(page, 10) }, "Refund requests retrieved");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/admin/refunds/:id/approve — Approve & Process Refund Request
 */
async function approveRefundRequest(req, res, next) {
  try {
    const refund = await RefundRequest.findById(req.params.id);
    if (!refund) {
      throw new NotFoundError("Refund request not found");
    }

    if (refund.status === "processed") {
      throw new ConflictError("Refund request has already been processed");
    }

    const { reviewNotes } = req.body;
    const refundOutcome = await razorpayService.createRefund({
      paymentId: refund.transactionRef || `pay_${Date.now()}`,
      amountRupees: refund.requestedAmount,
      notes: { refundNumber: refund.refundNumber, reason: refund.reason },
    });

    refund.status = "processed";
    refund.reviewedBy = req.user._id;
    refund.reviewNotes = reviewNotes ? reviewNotes.trim() : "Approved by administrator";
    refund.providerRefundId = refundOutcome.id;
    refund.processedAt = new Date();
    await refund.save();

    // Update linked order if present
    if (refund.orderId) {
      const order = await Order.findById(refund.orderId);
      if (order) {
        order.orderStatus = refund.requestedAmount >= order.paidAmount ? "refunded" : "partially_refunded";
        order.paymentStatus = refund.requestedAmount >= order.paidAmount ? "refunded" : "partially_refunded";
        order.history.push({
          action: "REFUND_APPROVED",
          toStatus: order.orderStatus,
          performedBy: req.user._id,
          timestamp: new Date(),
          notes: `Refund of ₹${refund.requestedAmount} approved by Admin (${req.user.name || req.user.email})`,
        });
        try {
    await order.save();
  } catch (orderSaveErr) {
    if (orderSaveErr.name === "VersionError") {
      console.warn("[Order] Concurrent order update detected; reloading fresh order state");
      const fresh = await Order.findById(order._id);
      if (fresh) {
        Object.assign(order, fresh.toObject());
      }
    } else {
      throw orderSaveErr;
    }
  }
      }
    }

    // Update linked invoice if present
    if (refund.invoiceId) {
      const invoice = await Invoice.findById(refund.invoiceId);
      if (invoice) {
        invoice.status = "refunded";
        invoice.refundDetails = {
          refundAmount: refund.requestedAmount,
          refundReason: refund.reason,
          refundedAt: new Date(),
          refundedBy: req.user._id,
          providerRefundId: refundOutcome.id,
        };
        await invoice.save();
        await Receipt.updateMany({ invoiceId: invoice._id }, { status: "refunded" });
      }
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "REFUND_APPROVED",
      targetEntity: "RefundRequest",
      targetId: refund._id.toString(),
      details: { refundNumber: refund.refundNumber, amount: refund.requestedAmount },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { refund }, "Refund approved and processed successfully");
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/admin/refunds/:id/reject — Reject Refund Request
 */
async function rejectRefundRequest(req, res, next) {
  try {
    const refund = await RefundRequest.findById(req.params.id);
    if (!refund) {
      throw new NotFoundError("Refund request not found");
    }

    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new ValidationError("A justification reason is required to reject a refund request");
    }

    refund.status = "rejected";
    refund.reviewedBy = req.user._id;
    refund.reviewNotes = rejectionReason.trim();
    await refund.save();

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "REFUND_REJECTED",
      targetEntity: "RefundRequest",
      targetId: refund._id.toString(),
      details: { refundNumber: refund.refundNumber, rejectionReason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { refund }, "Refund request rejected");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  getPublicCheckoutOrder,
  createOrderPaymentAttempt,
  createCheckoutPaymentAttempt,
  verifyOrderPayment,
  verifyCheckoutPayment,
  getOrderPaymentStatus,
  createOrderRefundRequest,
  listRefundRequests,
  approveRefundRequest,
  rejectRefundRequest,
  processPaymentAttempt,
  processVerifyPayment,
  SERVICES_CATALOG,
};

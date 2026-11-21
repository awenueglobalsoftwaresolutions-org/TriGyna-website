"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const env = require("../../config/env");

// Domain Models
const Order = require("./order.model");
const Invoice = require("./invoice.model");
const Payment = require("./payment.model");
const Receipt = require("./receipt.model");
const PaymentLink = require("./payment-link.model");
const Package = require("../packages/package.model");
const Service = require("../services/service.model");
const Patient = require("../patients/patient.model");
const Lead = require("../crm/lead.model");
const User = require("../users/user.model");
const Organization = require("../organization/organization.model");

// Services & Helpers
const razorpayService = require("./razorpay.service");
const { recordAudit } = require("../audit/audit.service");
const { sendSuccess } = require("../../shared/response");
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require("../../shared/errors");
const {
  roundToTwo,
  generateInvoiceNumber,
  createReceiptForPayment,
  recordLedgerEntry,
} = require("./billing.service");
const {
  generateAtomicOrderNumber,
  generateAtomicInvoiceNumber,
  generateAtomicPatientCode,
} = require("../../shared/counter.service");
const {
  processPaymentAttempt,
  processVerifyPayment,
  SERVICES_CATALOG,
} = require("./order.controller");
const { generateInvoicePdf } = require("./invoice-pdf.service");
const { generateReceiptPdf } = require("./receipt-pdf.service");

/**
 * Helper: Resolve Order document from any public reference
 * Supports: checkoutToken (hex), orderNumber (ORD-YYYY-XXXX), or MongoDB ObjectId
 */
async function resolveOrder(ref) {
  if (!ref || typeof ref !== "string") return null;
  const cleanRef = ref.trim();

  // 1. Try checkoutToken
  let order = await Order.findOne({ checkoutToken: cleanRef })
    .populate("packageId")
    .populate("invoiceId")
    .populate("receiptId");

  if (order) return order;

  // 2. Try orderNumber
  order = await Order.findOne({ orderNumber: cleanRef })
    .populate("packageId")
    .populate("invoiceId")
    .populate("receiptId");

  if (order) return order;

  // 3. Try razorpayPaymentLinkId on Order
  order = await Order.findOne({ razorpayPaymentLinkId: cleanRef })
    .populate("packageId")
    .populate("invoiceId")
    .populate("receiptId");

  if (order) return order;

  // 4. Try PaymentLink lookup
  const plink = await PaymentLink.findOne({
    $or: [{ paymentLinkId: cleanRef }, { razorpayPaymentLinkId: cleanRef }],
  });

  if (plink) {
    if (plink.orderId) {
      order = await Order.findById(plink.orderId)
        .populate("packageId")
        .populate("invoiceId")
        .populate("receiptId");
      if (order) return order;
    }
    if (plink.invoiceId) {
      const inv = await Invoice.findById(plink.invoiceId);
      if (inv?.orderId) {
        order = await Order.findById(inv.orderId)
          .populate("packageId")
          .populate("invoiceId")
          .populate("receiptId");
        if (order) return order;
      }
    }
  }

  // 5. Try providerOrderId in paymentAttempts or Payment document
  order = await Order.findOne({ "paymentAttempts.providerOrderId": cleanRef })
    .populate("packageId")
    .populate("invoiceId")
    .populate("receiptId");
  if (order) return order;

  const paymentDoc = await Payment.findOne({
    $or: [{ providerOrderId: cleanRef }, { providerTransactionId: cleanRef }],
  });
  if (paymentDoc?.orderId) {
    order = await Order.findById(paymentDoc.orderId)
      .populate("packageId")
      .populate("invoiceId")
      .populate("receiptId");
    if (order) return order;
  }

  // 6. Try MongoDB ObjectId if valid format
  if (mongoose.Types.ObjectId.isValid(cleanRef)) {
    order = await Order.findById(cleanRef)
      .populate("packageId")
      .populate("invoiceId")
      .populate("receiptId");
  }

  return order;
}

/**
 * Helper: Generate safe public order DTO with zero PHI/PII leakage
 */
function toPublicCheckoutDto(order, isExpired = false) {
  const maskedPhone =
    order.customerPhone && order.customerPhone.length >= 4
      ? order.customerPhone.slice(-4).padStart(10, "*")
      : "**********";

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    checkoutToken: order.checkoutToken,
    serviceName: order.serviceName,
    customerName: order.customerName,
    customerPhoneMasked: maskedPhone,
    customerEmail: order.customerEmail || "",
    consultationMode: order.consultationMode,
    items: order.items || [],
    subtotal: order.subtotal,
    discountAmount: order.discountAmount || 0,
    taxAmount: order.taxAmount || 0,
    totalAmount: order.totalAmount,
    paidAmount: order.paidAmount || 0,
    balanceDue: order.balanceDue,
    currency: order.currency || "INR",
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    terms: order.terms || {
      validityDays: 90,
      totalSessions: 1,
      cancellationPolicy: "Cancellations allowed up to 4 hours prior to appointment.",
      refundPolicy: "Full refund within 7 days if no session credits consumed.",
    },
    packageDetails: order.packageId
      ? {
          id: order.packageId._id,
          name: order.packageId.name,
          slug: order.packageId.slug,
          description: order.packageId.description,
          totalSessions: order.packageId.totalSessions,
          sessionDurationMinutes: order.packageId.sessionDurationMinutes,
          features: order.packageId.features || [],
        }
      : null,
    invoiceNumber: order.invoiceId?.invoiceNumber || null,
    receiptNumber: order.receiptId?.receiptNumber || null,
    isExpired,
    razorpayKeyId: env.RAZORPAY_KEY_ID || "",
  };
}

/**
 * GET /api/v1/checkout/catalog-item
 * Query package or service item for real-time checkout initialization
 */
async function getPublicCatalogItem(req, res, next) {
  try {
    const { packageId, packageSlug, serviceId, serviceCode, serviceSlug } = req.query;

    if (packageId || packageSlug) {
      const query = packageId
        ? { _id: packageId }
        : { slug: String(packageSlug).toLowerCase().trim() };

      const pkg = await Package.findOne(query);
      if (!pkg) {
        return next(new NotFoundError("Wellness Package not found in catalogue"));
      }

      const priceRupees = roundToTwo(pkg.pricePaise / 100);
      return sendSuccess(
        res,
        {
          type: "package",
          item: {
            id: pkg._id,
            name: pkg.name,
            slug: pkg.slug,
            description: pkg.description,
            price: priceRupees,
            pricePaise: pkg.pricePaise,
            totalSessions: pkg.totalSessions,
            sessionDurationMinutes: pkg.sessionDurationMinutes,
            validityDays: pkg.validityDays,
            features: pkg.features || [],
            inclusions: pkg.features || [
              "Specialist Doctor Consultation",
              "Personalized Clinical Care Plan",
              "Digital Regimen & Prescriptions",
              "Dedicated Care Coordinator Support",
            ],
          },
        },
        "Package details loaded for checkout"
      );
    }

    if (serviceId || serviceCode || serviceSlug) {
      let srv = null;
      if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
        srv = await Service.findById(serviceId);
      } else if (serviceSlug) {
        srv = await Service.findOne({ slug: String(serviceSlug).toLowerCase().trim() });
      } else if (serviceCode) {
        srv = await Service.findOne({ code: String(serviceCode).toUpperCase().trim() });
      }

      if (!srv) {
        // Fallback to static catalog reference
        srv = SERVICES_CATALOG.find(
          (s) =>
            s.code === serviceCode ||
            s.name.toLowerCase() === String(serviceSlug || "").toLowerCase()
        );
      }

      if (!srv) {
        return next(new NotFoundError("Clinical Service not found in catalogue"));
      }

      const priceRupees = roundToTwo(srv.baseFee || srv.price || 800);
      return sendSuccess(
        res,
        {
          type: "service",
          item: {
            id: srv._id || srv.code,
            name: srv.name,
            code: srv.code,
            slug: srv.slug || srv.code.toLowerCase(),
            description: srv.description || "Comprehensive clinical consultation with specialist care.",
            price: priceRupees,
            pricePaise: Math.round(priceRupees * 100),
            totalSessions: 1,
            durationMinutes: srv.durationMinutes || 30,
            validityDays: 30,
            features: [
              "One-on-One Specialist Consultation",
              "Clinical History & Symptom Evaluation",
              "Digital Regimen & Prescriptions",
              "Dietary & Lifestyle Advice",
            ],
            inclusions: [
              "Specialist Doctor Consultation",
              "Clinical History & Symptom Evaluation",
              "Digital Regimen & Prescriptions",
            ],
          },
        },
        "Service details loaded for checkout"
      );
    }

    return next(new ValidationError("Either package or service identifier is required"));
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/checkout/orders
 * Public Website Checkout: Initiates real Order, pending Invoice, and Razorpay Order
 */
async function createCheckoutOrder(req, res, next) {
  try {
    const {
      packageId,
      packageSlug,
      serviceId,
      serviceCode,
      serviceSlug,
      customerName,
      customerPhone,
      customerEmail,
      consultationMode = "Online Video Consultation",
      notes,
    } = req.body;

    // Strict validation
    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return next(new ValidationError("Customer full name is required for medical order"));
    }
    if (!customerPhone || typeof customerPhone !== "string" || !customerPhone.trim()) {
      return next(new ValidationError("Valid mobile phone number is required for order verification"));
    }

    const cleanPhone = customerPhone.replace(/[^0-9+]/g, "").trim();
    if (cleanPhone.length < 10) {
      return next(new ValidationError("Phone number must have at least 10 digits"));
    }

    const cleanEmail = customerEmail ? customerEmail.trim().toLowerCase() : undefined;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return next(new ValidationError("Please provide a valid email address"));
    }

    // 1. Authoritative Package / Service Lookup from MongoDB
    let orderItem = null;
    let orderServiceName = "";
    let orderTerms = {
      validityDays: 90,
      totalSessions: 1,
      cancellationPolicy: "Cancellations allowed up to 4 hours prior to scheduled consultation.",
      refundPolicy: "Full refund within 7 days if no session credits consumed.",
    };
    let resolvedPackageId = null;

    if (packageId || packageSlug) {
      const query = packageId
        ? { _id: packageId }
        : { slug: String(packageSlug).toLowerCase().trim() };
      const pkg = await Package.findOne(query);
      if (!pkg) {
        return next(new NotFoundError("Referenced package not found in catalogue"));
      }

      const unitPrice = roundToTwo(pkg.pricePaise / 100);
      resolvedPackageId = pkg._id;
      orderServiceName = pkg.name;
      orderTerms.validityDays = pkg.validityDays || 90;
      orderTerms.totalSessions = pkg.totalSessions || 1;

      orderItem = {
        packageId: pkg._id,
        description: pkg.name,
        details: pkg.description || `Includes ${pkg.totalSessions} sessions (${pkg.sessionDurationMinutes || 30} mins each).`,
        unitPrice,
        quantity: 1,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        amount: unitPrice,
        totalSessions: pkg.totalSessions || 1,
        validityDays: pkg.validityDays || 90,
      };
    } else {
      let srv = null;
      if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
        srv = await Service.findById(serviceId);
      } else if (serviceSlug) {
        srv = await Service.findOne({ slug: String(serviceSlug).toLowerCase().trim() });
      } else if (serviceCode) {
        srv = await Service.findOne({ code: String(serviceCode).toUpperCase().trim() });
      }

      if (!srv) {
        srv = SERVICES_CATALOG.find(
          (s) =>
            s.code === serviceCode ||
            s.name.toLowerCase() === String(serviceSlug || "").toLowerCase()
        ) || SERVICES_CATALOG[0];
      }

      const unitPrice = roundToTwo(srv.baseFee || srv.price || 800);
      orderServiceName = srv.name;
      orderItem = {
        description: srv.name,
        details: srv.description || "Specialist clinical consultation",
        unitPrice,
        quantity: 1,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        amount: unitPrice,
        totalSessions: 1,
        validityDays: 30,
      };
    }

    const subtotal = roundToTwo(orderItem.amount);
    const totalAmount = subtotal;
    const balanceDue = totalAmount;

    // 2. Patient / User Association
    let resolvedPatientId = null;
    let resolvedUserId = null;

    if (req.user && req.user.role === "patient") {
      const existingPatient = await Patient.findOne({ userId: req.user._id });
      if (existingPatient) {
        resolvedPatientId = existingPatient._id;
        resolvedUserId = req.user._id;
      }
    } else {
      // Guest Checkout: Check if patient already exists by phone & exact name
      const existingPt = await Patient.findOne({ phone: cleanPhone });
      if (existingPt && existingPt.fullName.toLowerCase().trim() === customerName.toLowerCase().trim()) {
        resolvedPatientId = existingPt._id;
        resolvedUserId = existingPt.userId || null;
      }
    }

    // 3. Generate Atomic Order Number & Unguessable Checkout Token
    const orderNumber = await generateAtomicOrderNumber();
    const checkoutToken = crypto.randomBytes(24).toString("hex");

    // 4. Create Order Record
    const order = await Order.create({
      orderNumber,
      patientId: resolvedPatientId || undefined,
      userId: resolvedUserId || undefined,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: cleanEmail,
      packageId: resolvedPackageId || undefined,
      serviceName: orderServiceName,
      consultationMode,
      items: [orderItem],
      subtotal,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalAmount,
      paidAmount: 0,
      balanceDue,
      currency: "INR",
      orderStatus: "pending_payment",
      paymentStatus: "pending",
      checkoutToken,
      checkoutExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      terms: orderTerms,
      notes: notes ? notes.trim() : "",
      history: [
        {
          action: "ORDER_CREATED",
          toStatus: "pending_payment",
          performedBy: req.user?._id,
          timestamp: new Date(),
          notes: "Initiated via public web checkout",
        },
      ],
    });

    // 5. Create Linked Official Pending Invoice
    const invoiceNumber = await generateAtomicInvoiceNumber("INV");
    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
      patientId: resolvedPatientId || undefined,
      currency: "INR",
      subtotal,
      discountAmount: 0,
      taxableAmount: subtotal,
      taxRate: 0,
      taxAmount: 0,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: "pending",
      items: [
        {
          description: orderItem.description,
          details: orderItem.details,
          unitPrice: orderItem.unitPrice,
          quantity: 1,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          amount: totalAmount,
        },
      ],
      payments: [],
      notes: `Generated for Order ${order.orderNumber}`,
      createdBy: req.user?._id,
    });

    order.invoiceId = invoice._id;
    await order.save();

    // 6. Record Initial Accounts Receivable Debit in Financial Ledger
    await recordLedgerEntry({
      entryType: "invoice_issued",
      classification: "debit",
      amount: totalAmount,
      invoiceId: invoice._id,
      patientId: resolvedPatientId,
      description: `Checkout Order ${order.orderNumber} placed: ${orderServiceName}`,
      balanceAfter: balanceDue,
      recordedBy: req.user?._id,
    });

    // 7. Initiate Razorpay Order for instant popup payment
    const paymentAttempt = await processPaymentAttempt(order);

    const checkoutUrl = `${env.FRONTEND_ORIGIN || "http://localhost:3000"}/checkout/${order.checkoutToken}`;

    return sendSuccess(
      res,
      {
        order: toPublicCheckoutDto(order),
        checkoutToken: order.checkoutToken,
        checkoutUrl,
        razorpay: {
          keyId: paymentAttempt.keyId,
          orderId: paymentAttempt.providerOrderId,
          amount: paymentAttempt.amountPaise,
          amountPaise: paymentAttempt.amountPaise,
          amountRupees: order.balanceDue,
          currency: paymentAttempt.currency,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail || "",
        },
      },
      "Checkout order created successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/checkout/orders/:reference
 * Retrieve public checkout snapshot with strict PHI masking
 */
async function getCheckoutOrder(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Invalid, expired, or non-existent checkout order"));
    }

    const isExpired = order.checkoutExpiresAt && new Date(order.checkoutExpiresAt) < new Date();
    if (isExpired && order.orderStatus === "pending_payment") {
      order.orderStatus = "expired";
      await order.save();
    }

    return sendSuccess(
      res,
      toPublicCheckoutDto(order, isExpired),
      "Checkout order information loaded"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/checkout/orders/:reference/validate
 * Pre-payment validation: checks payable status and server readiness
 */
async function validateCheckoutOrder(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    if (order.orderStatus === "paid" || order.balanceDue <= 0) {
      return next(new ConflictError("Order is already fully paid and settled"));
    }

    if (["cancelled", "expired"].includes(order.orderStatus)) {
      return next(new ConflictError(`This order is ${order.orderStatus} and cannot be paid`));
    }

    return sendSuccess(
      res,
      {
        valid: true,
        orderNumber: order.orderNumber,
        serviceName: order.serviceName,
        totalAmount: order.totalAmount,
        balanceDue: order.balanceDue,
        currency: order.currency || "INR",
        isReadyForPayment: true,
      },
      "Order validated and ready for payment"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/checkout/orders/:reference/payment
 * Generate or retrieve current active Razorpay Order attempt
 */
async function createCheckoutPayment(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    const result = await processPaymentAttempt(order);
    const razorpayOptions = {
      keyId: result.keyId,
      orderId: result.providerOrderId,
      amount: result.amountPaise,
      amountPaise: result.amountPaise,
      amountRupees: order.balanceDue,
      currency: result.currency,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || "",
    };

    return sendSuccess(
      res,
      {
        ...result,
        razorpay: razorpayOptions,
      },
      "Razorpay payment attempt created"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/checkout/orders/:reference/verify
 * Cryptographic HMAC-SHA256 signature verification & post-payment fulfillment
 */
async function verifyCheckoutPaymentHandler(req, res, next) {
  try {
    const reference =
      req.params.reference ||
      req.body.reference ||
      req.body.orderId ||
      req.body.token ||
      req.body.razorpay_order_id ||
      req.body.razorpayOrderId;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Order not found for verification"));
    }

    const result = await processVerifyPayment(order, req.body, req.user || null, req.ip);

    return sendSuccess(
      res,
      {
        verified: true,
        order: result.order || order,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        receipt: result.receipt || {
          receiptNumber: result.receiptNumber,
          verificationToken: result.receiptVerificationToken,
        },
        receiptNumber: result.receiptNumber,
        receiptVerificationToken: result.receiptVerificationToken,
        entitlementId: result.entitlementId,
        idempotent: Boolean(result.idempotent),
      },
      "Payment verified successfully. Receipt and package entitlements generated."
    );
  } catch (err) {
    if (err.name === "VersionError") {
      try {
        const reference =
          req.params.reference ||
          req.body.reference ||
          req.body.orderId ||
          req.body.token ||
          req.body.razorpay_order_id ||
          req.body.razorpayOrderId;
        const freshOrder = await resolveOrder(reference);
        if (freshOrder && (freshOrder.orderStatus === "paid" || freshOrder.receiptId)) {
          const receipt = freshOrder.receiptId ? await Receipt.findById(freshOrder.receiptId) : null;
          return sendSuccess(
            res,
            {
              verified: true,
              order: freshOrder,
              orderNumber: freshOrder.orderNumber,
              orderStatus: freshOrder.orderStatus,
              paymentStatus: freshOrder.paymentStatus,
              receipt: receipt || {
                receiptNumber: receipt ? receipt.receiptNumber : "RCP/CONFIRMED",
                verificationToken: receipt ? receipt.verificationToken : null,
              },
              receiptNumber: receipt ? receipt.receiptNumber : "RCP/CONFIRMED",
              receiptVerificationToken: receipt ? receipt.verificationToken : null,
              entitlementId: freshOrder.entitlementId || null,
              idempotent: true,
            },
            "Payment verified idempotently under concurrent execution"
          );
        }
      } catch (innerErr) {
        // Fall through to next(err)
      }
    }
    return next(err);
  }
}

/**
 * GET /api/v1/checkout/orders/:reference/status
 * Polling endpoint for live order & receipt settlement status
 */
async function getCheckoutStatus(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    let receiptData = null;
    if (order.receiptId) {
      const receipt = await Receipt.findById(order.receiptId);
      if (receipt) {
        receiptData = {
          receiptNumber: receipt.receiptNumber,
          verificationToken: receipt.verificationToken,
          issuedAt: receipt.issuedAt,
          amountPaid: receipt.amountPaid,
        };
      }
    }

    return sendSuccess(
      res,
      {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        balanceDue: order.balanceDue,
        isSettled: order.orderStatus === "paid",
        receipt: receiptData,
        entitlementId: order.entitlementId || null,
        updatedAt: order.updatedAt,
      },
      "Order status retrieved"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/checkout/orders/:reference/retry
 * Safe retry on failed payment: generates fresh gateway order
 */
async function retryCheckoutPayment(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    if (order.orderStatus === "paid") {
      return next(new ConflictError("Order is already settled"));
    }

    // Reset temporary initiated/failed payment state back to pending
    order.paymentStatus = "pending";
    await order.save();

    const paymentAttempt = await processPaymentAttempt(order);
    return sendSuccess(res, paymentAttempt, "Payment retry initialized with new provider order");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/checkout/orders/:reference/patient
 * Edit patient name, email, or consultation mode prior to payment
 */
async function updateCheckoutPatient(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order) {
      return next(new NotFoundError("Order not found"));
    }

    if (order.orderStatus === "paid") {
      return next(new ConflictError("Cannot modify details of a settled order"));
    }

    const { customerName, customerEmail, consultationMode } = req.body;

    if (customerName && customerName.trim()) {
      order.customerName = customerName.trim();
    }
    if (customerEmail && customerEmail.trim()) {
      order.customerEmail = customerEmail.trim().toLowerCase();
    }
    if (consultationMode && ["Online Video Consultation", "In-Clinic Consultation"].includes(consultationMode)) {
      order.consultationMode = consultationMode;
    }

    await order.save();

    return sendSuccess(
      res,
      toPublicCheckoutDto(order),
      "Patient checkout details updated successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/checkout/payment-links/:reference
 * Resolve admin-generated PaymentLink
 */
async function getPaymentLinkDetails(req, res, next) {
  try {
    const { reference } = req.params;
    const cleanRef = reference.trim();

    const plink = await PaymentLink.findOne({
      $or: [
        { paymentLinkId: cleanRef },
        { razorpayPaymentLinkId: cleanRef },
        ...(mongoose.Types.ObjectId.isValid(cleanRef) ? [{ _id: cleanRef }] : []),
      ],
    })
      .populate("invoiceId")
      .populate("patientId");

    if (!plink) {
      return next(new NotFoundError("Payment link not found or expired"));
    }

    const isExpired = plink.expiryDate && new Date(plink.expiryDate) < new Date();
    if (isExpired && plink.status === "active") {
      plink.status = "expired";
      await plink.save();
    }

    return sendSuccess(
      res,
      {
        paymentLinkId: plink.paymentLinkId,
        razorpayPaymentLinkId: plink.razorpayPaymentLinkId,
        amount: plink.amount,
        paidAmount: plink.paidAmount || 0,
        balanceDue: plink.balanceDue,
        currency: plink.currency || "INR",
        status: plink.status,
        description: plink.description,
        customerName: plink.customerName,
        customerPhoneMasked: plink.customerPhone ? plink.customerPhone.slice(-4).padStart(10, "*") : "",
        customerEmail: plink.customerEmail || "",
        shortUrl: plink.shortUrl,
        allowPartialPayment: plink.allowPartialPayment,
        isExpired,
        invoiceNumber: plink.invoiceId?.invoiceNumber || null,
        razorpayKeyId: env.RAZORPAY_KEY_ID || "",
      },
      "Payment link loaded successfully"
    );
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/checkout/orders/:reference/invoice
 * Stream Invoice PDF for public checkout confirmation
 */
async function downloadCheckoutInvoice(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order || !order.invoiceId) {
      return next(new NotFoundError("Associated invoice not found"));
    }

    const invoice = await Invoice.findById(order.invoiceId)
      .populate("patientId", "patientCode fullName phone email address")
      .populate("appointmentId");

    if (!invoice) {
      return next(new NotFoundError("Invoice not found"));
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

/**
 * GET /api/v1/checkout/orders/:reference/receipt
 * Stream Receipt PDF for public checkout confirmation
 */
async function downloadCheckoutReceipt(req, res, next) {
  try {
    const { reference } = req.params;
    const order = await resolveOrder(reference);

    if (!order || !order.receiptId) {
      return next(new NotFoundError("Associated payment receipt not found"));
    }

    const receipt = await Receipt.findById(order.receiptId)
      .populate("patientId", "patientCode fullName phone email address")
      .populate("invoiceId");

    if (!receipt) {
      return next(new NotFoundError("Receipt document not found"));
    }

    const org = await Organization.findOne({ status: "active" }).lean();
    const filename = `TriGyna-Receipt-${receipt.receiptNumber.replace(/[\/\\]/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    await generateReceiptPdf(receipt, res, org);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getPublicCatalogItem,
  createCheckoutOrder,
  getCheckoutOrder,
  validateCheckoutOrder,
  createCheckoutPayment,
  verifyCheckoutPaymentHandler,
  getCheckoutStatus,
  retryCheckoutPayment,
  updateCheckoutPatient,
  getPaymentLinkDetails,
  downloadCheckoutInvoice,
  downloadCheckoutReceipt,
};


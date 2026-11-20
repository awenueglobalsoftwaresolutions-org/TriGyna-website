const mongoose = require("mongoose");
const crypto = require("crypto");

const orderItemSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSessions: {
      type: Number,
      default: 1,
      min: 1,
    },
    validityDays: {
      type: Number,
      default: 90,
      min: 1,
    },
  },
  { _id: true }
);

const paymentAttemptSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: "razorpay",
      trim: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["initiated", "success", "failed"],
      default: "initiated",
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    error: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const orderHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    toStatus: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      index: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    consultationMode: {
      type: String,
      enum: ["Online Video Consultation", "In-Clinic Consultation", "ONLINE_VIDEO"],
      default: "Online Video Consultation",
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountReason: {
      type: String,
      trim: true,
    },
    discountApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "draft",
        "pending_payment",
        "paid",
        "cancelled",
        "expired",
        "partially_refunded",
        "refunded",
      ],
      default: "pending_payment",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "initiated",
        "success",
        "failed",
        "partially_refunded",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    checkoutToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: () => crypto.randomBytes(24).toString("hex"),
    },
    checkoutExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
    },
    razorpayPaymentLinkId: {
      type: String,
      trim: true,
      index: true,
    },
    razorpayPaymentLinkUrl: {
      type: String,
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      index: true,
    },
    entitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PackageEntitlement",
      index: true,
    },
    paymentAttempts: [paymentAttemptSchema],
    terms: {
      validityDays: {
        type: Number,
        default: 90,
      },
      totalSessions: {
        type: Number,
        default: 1,
      },
      cancellationPolicy: {
        type: String,
        default: "Cancellations allowed up to 4 hours prior to scheduled consultation.",
      },
      refundPolicy: {
        type: String,
        default: "Full refund within 7 days if no session credits consumed, subject to management approval.",
      },
    },
    salesExecutiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
    history: [orderHistorySchema],
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ patientId: 1, createdAt: -1 });
orderSchema.index({ leadId: 1, createdAt: -1 });
orderSchema.index({ salesExecutiveId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;


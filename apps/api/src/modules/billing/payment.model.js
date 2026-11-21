const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "cash", "bank_transfer", "netbanking", "wallet", "razorpay", "other"],
      required: true,
    },
    paymentProvider: {
      type: String,
      default: "razorpay", // upi, phonepe, razorpay, stripe, cash, manual_pos
      trim: true,
    },
    providerTransactionId: {
      type: String,
      trim: true,
      index: true,
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
    razorpayPaymentLinkId: {
      type: String,
      trim: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
    },
    paymentLinkUrl: {
      type: String,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "processing",
        "partially_paid",
        "success",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING",
        "PROCESSING",
        "PARTIALLY_PAID",
        "PAID",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
    },
    paymentInitiatedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    refundSummary: {
      refundedAmount: { type: Number, default: 0 },
      refundStatus: { type: String, enum: ["none", "requested", "partial", "full"], default: "none" },
      refundedAt: { type: Date },
      reason: { type: String, trim: true },
    },
    notes: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Bidirectional synchronization between legacy and standard FinTech fields
paymentSchema.pre("validate", function (next) {
  if (!this.paymentNumber && this.paymentReference) {
    this.paymentNumber = this.paymentReference;
  }
  if (!this.paymentReference && this.paymentNumber) {
    this.paymentReference = this.paymentNumber;
  }

  // Cross-sync razorpay IDs
  if (this.razorpayPaymentId && !this.providerPaymentId) {
    this.providerPaymentId = this.razorpayPaymentId;
  }
  if (this.providerPaymentId && !this.razorpayPaymentId) {
    this.razorpayPaymentId = this.providerPaymentId;
  }
  if (this.razorpayPaymentId && !this.providerTransactionId) {
    this.providerTransactionId = this.razorpayPaymentId;
  }
  if (this.providerTransactionId && !this.razorpayPaymentId) {
    this.razorpayPaymentId = this.providerTransactionId;
  }
  if (this.razorpayOrderId && !this.providerOrderId) {
    this.providerOrderId = this.razorpayOrderId;
  }
  if (this.providerOrderId && !this.razorpayOrderId) {
    this.razorpayOrderId = this.providerOrderId;
  }

  // User synchronization
  if (this.createdBy && !this.recordedBy) {
    this.recordedBy = this.createdBy;
  }
  if (this.recordedBy && !this.createdBy) {
    this.createdBy = this.recordedBy;
  }

  // Status mapping
  const statusMap = {
    initiated: "PROCESSING",
    pending: "PENDING",
    processing: "PROCESSING",
    partially_paid: "PARTIALLY_PAID",
    success: "PAID",
    paid: "PAID",
    failed: "FAILED",
    cancelled: "CANCELLED",
    expired: "EXPIRED",
    refunded: "REFUNDED",
    partially_refunded: "PARTIALLY_REFUNDED",
  };

  const reverseStatusMap = {
    DRAFT: "pending",
    PENDING: "pending",
    PROCESSING: "processing",
    PARTIALLY_PAID: "partially_paid",
    PAID: "success",
    FAILED: "failed",
    CANCELLED: "cancelled",
    EXPIRED: "expired",
    REFUNDED: "refunded",
    PARTIALLY_REFUNDED: "partially_refunded",
  };

  if (this.isModified("status") && !this.isModified("paymentStatus")) {
    this.paymentStatus = statusMap[this.status] || "PENDING";
  } else if (this.isModified("paymentStatus") && !this.isModified("status")) {
    this.status = reverseStatusMap[this.paymentStatus] || "pending";
  } else if (!this.paymentStatus) {
    this.paymentStatus = statusMap[this.status] || "PENDING";
  }

  // Balance & Amount Due
  if (this.amount != null) {
    if (this.amountPaid == null) {
      this.amountPaid = this.status === "success" || this.paymentStatus === "PAID" ? this.amount : 0;
    }
    if (this.amountDue == null) {
      this.amountDue = Math.max(0, this.amount - this.amountPaid);
    }
  }

  next();
});

paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;

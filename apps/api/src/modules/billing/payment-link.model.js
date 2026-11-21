const mongoose = require("mongoose");

const paymentLinkSchema = new mongoose.Schema(
  {
    paymentLinkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    razorpayPaymentLinkId: {
      type: String,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    shortUrl: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "TriGyna Healthcare Consultation & Clinical Care",
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    allowPartialPayment: {
      type: Boolean,
      default: false,
    },
    minPartialAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["created", "active", "partially_paid", "paid", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: function () {
        return Math.max(0, this.amount - (this.paidAmount || 0));
      },
    },
    expiryDate: {
      type: Date,
    },
    referenceId: {
      type: String,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    payments: [
      {
        paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
        razorpayPaymentId: { type: String, trim: true },
        amount: { type: Number },
        paidAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paidAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

paymentLinkSchema.index({ createdAt: -1 });
paymentLinkSchema.index({ patientId: 1, createdAt: -1 });

const PaymentLink = mongoose.model("PaymentLink", paymentLinkSchema);

module.exports = PaymentLink;

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
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "cash", "bank_transfer", "netbanking", "wallet"],
      required: true,
    },
    paymentProvider: {
      type: String,
      default: "upi", // upi, phonepe, razorpay, stripe, cash, manual_pos
      trim: true,
    },
    providerTransactionId: {
      type: String,
      trim: true,
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
      enum: ["initiated", "pending", "success", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
    },
    paidAt: {
      type: Date,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;

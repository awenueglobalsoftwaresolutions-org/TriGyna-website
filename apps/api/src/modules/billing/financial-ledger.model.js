const mongoose = require("mongoose");

const financialLedgerSchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: [
        "invoice_issued",
        "payment_received",
        "offline_payment",
        "refund_processed",
        "credit_note_issued",
        "adjustment",
        "fee",
      ],
      required: true,
      index: true,
    },
    classification: {
      type: String,
      enum: ["debit", "credit"],
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
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      index: true,
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundRequest",
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    balanceAfter: {
      type: Number,
    },
    gatewayRef: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

financialLedgerSchema.index({ createdAt: -1 });
financialLedgerSchema.index({ patientId: 1, createdAt: -1 });

const FinancialLedger = mongoose.model("FinancialLedger", financialLedgerSchema);

module.exports = FinancialLedger;


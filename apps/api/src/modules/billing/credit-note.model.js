const mongoose = require("mongoose");

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: {
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
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundRequest",
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Credit note amount must be greater than zero"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    reason: {
      type: String,
      required: [true, "Reason for issuing credit note is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["issued", "applied", "voided"],
      default: "issued",
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

creditNoteSchema.index({ createdAt: -1 });

const CreditNote = mongoose.model("CreditNote", creditNoteSchema);

module.exports = CreditNote;


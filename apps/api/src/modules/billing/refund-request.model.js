const mongoose = require("mongoose");

const refundRequestSchema = new mongoose.Schema(
  {
    refundNumber: {
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
    requestedAmount: {
      type: Number,
      required: true,
      min: [1, "Refund amount must be greater than zero"],
    },
    reason: {
      type: String,
      required: [true, "Reason for refund is required"],
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: "upi",
    },
    refundDestination: {
      type: String, // Bank Account or UPI VPA
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "processed", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    transactionRef: {
      type: String,
      trim: true,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

refundRequestSchema.index({ patientId: 1, createdAt: -1 });

const RefundRequest = mongoose.model("RefundRequest", refundRequestSchema);

module.exports = RefundRequest;

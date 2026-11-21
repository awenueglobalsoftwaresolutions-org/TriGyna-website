const mongoose = require("mongoose");

/**
 * PaymentWebhookEvent Schema
 * Tracks incoming Razorpay and payment provider webhook events with cryptographic
 * verification status and idempotency guarantees.
 */
const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    razorpayEntityId: {
      type: String,
      trim: true,
      index: true,
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processed", "duplicate", "failed", "ignored"],
      default: "pending",
      index: true,
    },
    processedAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

paymentWebhookEventSchema.index({ createdAt: -1 });

const PaymentWebhookEvent = mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);

module.exports = PaymentWebhookEvent;

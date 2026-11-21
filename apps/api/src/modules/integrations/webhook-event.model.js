const mongoose = require("mongoose");

const whatsappWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["inbound_message", "status_update", "error", "handshake", "other"],
      required: true,
      index: true,
    },
    senderPhone: {
      type: String,
      index: true,
      trim: true,
    },
    providerMessageId: {
      type: String,
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["processed", "duplicate", "ignored", "failed"],
      default: "processed",
      index: true,
    },
    payloadSummary: {
      type: String,
      trim: true,
    },
    rawSignatureVerified: {
      type: Boolean,
      default: false,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

whatsappWebhookEventSchema.index({ createdAt: -1 });

const WhatsAppWebhookEvent = mongoose.model("WhatsAppWebhookEvent", whatsappWebhookEventSchema);

module.exports = WhatsAppWebhookEvent;


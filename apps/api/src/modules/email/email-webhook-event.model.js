const mongoose = require("mongoose");

const emailWebhookEventSchema = new mongoose.Schema(
  {
    providerEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    providerEmailId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    eventTimestamp: {
      type: Date,
      default: Date.now,
    },
    processingStatus: {
      type: String,
      enum: ["received", "processed", "ignored", "failed"],
      default: "received",
      index: true,
    },
    processingAttempts: {
      type: Number,
      default: 1,
    },
    error: {
      type: String,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

emailWebhookEventSchema.index({ eventType: 1, createdAt: -1 });
emailWebhookEventSchema.index({ providerEmailId: 1, eventTimestamp: -1 });

module.exports = mongoose.model("EmailWebhookEvent", emailWebhookEventSchema);

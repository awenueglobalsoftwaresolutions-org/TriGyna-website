const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    languageCode: {
      type: String,
      default: "en_IN",
    },
    templateVariables: [
      {
        type: String,
        trim: true,
      },
    ],
    audienceFilters: {
      serviceInterest: [{ type: String, trim: true }],
      leadStage: [{ type: String, trim: true }],
      source: [{ type: String, trim: true }],
      hasConsentOnly: { type: Boolean, default: true },
      excludeOptedOut: { type: Boolean, default: true },
      excludeExistingPatients: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "scheduled", "running", "paused", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    scheduledAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    batchSize: {
      type: Number,
      default: 20,
    },
    rateLimitPerMinute: {
      type: Number,
      default: 60,
    },
    stats: {
      targetCount: { type: Number, default: 0 },
      queuedCount: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      deliveredCount: { type: Number, default: 0 },
      readCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      optOutCount: { type: Number, default: 0 },
      repliesCount: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, scheduledAt: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = Campaign;


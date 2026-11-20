const mongoose = require("mongoose");

const campaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    contactPhone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "queued", "accepted", "sent", "delivered", "read", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    skipReason: {
      type: String,
      trim: true,
    },
    messageId: {
      type: String,
      index: true,
      sparse: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

campaignRecipientSchema.index({ campaignId: 1, contactPhone: 1 }, { unique: true });
campaignRecipientSchema.index({ campaignId: 1, status: 1 });

const CampaignRecipient = mongoose.model("CampaignRecipient", campaignRecipientSchema);

module.exports = CampaignRecipient;


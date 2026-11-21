const mongoose = require("mongoose");

const campaignPerformanceSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketingCampaign",
      required: true,
      index: true,
    },
    campaignCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    reach: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    spend: {
      type: Number,
      default: 0,
    },
    leads: {
      type: Number,
      default: 0,
    },
    bookings: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
    attributedRevenue: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    channel: {
      type: String,
      default: "meta",
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

campaignPerformanceSchema.index({ campaignId: 1, date: 1 }, { unique: true });

const CampaignPerformance = mongoose.model("CampaignPerformance", campaignPerformanceSchema);

module.exports = CampaignPerformance;

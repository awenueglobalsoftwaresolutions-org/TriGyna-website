const mongoose = require("mongoose");

const utmTrackingSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Tracking link title is required"],
      trim: true,
    },
    destinationUrl: {
      type: String,
      required: [true, "Destination URL is required"],
      trim: true,
    },
    fullUrl: {
      type: String,
      required: true,
      trim: true,
    },
    utmSource: {
      type: String,
      required: true,
      trim: true,
    },
    utmMedium: {
      type: String,
      required: true,
      trim: true,
    },
    utmCampaign: {
      type: String,
      required: true,
      trim: true,
    },
    utmContent: {
      type: String,
      trim: true,
    },
    utmTerm: {
      type: String,
      trim: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketingCampaign",
      sparse: true,
    },
    qrCodeData: {
      type: String,
    },
    clicksCount: {
      type: Number,
      default: 0,
    },
    leadsCount: {
      type: Number,
      default: 0,
    },
    conversionsCount: {
      type: Number,
      default: 0,
    },
    lastClickedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const UTMTracking = mongoose.model("UTMTracking", utmTrackingSchema);

module.exports = UTMTracking;

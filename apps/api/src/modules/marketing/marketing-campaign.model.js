const mongoose = require("mongoose");

const marketingCampaignSchema = new mongoose.Schema(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    platform: {
      type: String,
      enum: ["meta", "google", "website", "whatsapp", "other"],
      required: true,
      default: "meta",
      index: true,
    },
    channelName: {
      type: String,
      trim: true,
      default: "Meta (Facebook/Instagram)",
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdvertisingAccount",
    },
    providerCampaignId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    objective: {
      type: String,
      enum: ["LEAD_GENERATION", "APPOINTMENT_BOOKING", "CONVERSIONS", "AWARENESS", "TRAFFIC"],
      default: "LEAD_GENERATION",
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "scheduled",
        "active",
        "paused",
        "completed",
        "rejected",
        "failed",
        "archived",
      ],
      default: "active",
      index: true,
    },
    branchId: {
      type: String,
      trim: true,
      default: "main_branch",
    },
    serviceCategory: {
      type: String,
      trim: true,
      default: "PCOS & Hormonal Health",
    },
    budget: {
      dailyBudget: { type: Number, default: 0, min: 0 },
      lifetimeBudget: { type: Number, default: 0, min: 0 },
      spendingLimit: { type: Number, default: 0, min: 0 },
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    creative: {
      headline: { type: String, trim: true },
      description: { type: String, trim: true },
      adCopy: { type: String, trim: true },
      cta: { type: String, trim: true, default: "Book Consultation" },
      destinationUrl: { type: String, trim: true },
      imageUrl: { type: String, trim: true },
      videoUrl: { type: String, trim: true },
      thumbnailUrl: { type: String, trim: true },
    },
    tracking: {
      utmSource: { type: String, trim: true },
      utmMedium: { type: String, trim: true },
      utmCampaign: { type: String, trim: true },
      utmContent: { type: String, trim: true },
      utmTerm: { type: String, trim: true },
      landingPage: { type: String, trim: true },
    },
    audience: {
      locations: [{ type: String, trim: true }],
      ageMin: { type: Number, default: 18 },
      ageMax: { type: Number, default: 65 },
      gender: { type: String, enum: ["all", "female", "male"], default: "female" },
      languages: [{ type: String, trim: true }],
      interests: [{ type: String, trim: true }],
    },
    metrics: {
      leadsCount: { type: Number, default: 0 },
      bookingsCount: { type: Number, default: 0 },
      spend: { type: Number, default: 0 },
      attributedRevenue: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
      costPerLead: { type: Number, default: 0 },
      costPerBooking: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      lastSyncedAt: { type: Date, default: Date.now },
    },
    approval: {
      submittedAt: { type: Date },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      notes: { type: String, trim: true },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

marketingCampaignSchema.index({ status: 1, platform: 1 });
marketingCampaignSchema.index({ createdAt: -1 });

const MarketingCampaign = mongoose.model("MarketingCampaign", marketingCampaignSchema);

module.exports = MarketingCampaign;

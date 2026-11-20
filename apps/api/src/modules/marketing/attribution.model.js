const mongoose = require("mongoose");

const marketingAttributionSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      sparse: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      sparse: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      sparse: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      sparse: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketingCampaign",
      sparse: true,
      index: true,
    },
    campaignCode: {
      type: String,
      trim: true,
      index: true,
    },
    campaignName: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["meta", "google", "website", "whatsapp", "referral", "organic", "other"],
      default: "meta",
      index: true,
    },
    channel: {
      type: String,
      trim: true,
      default: "Meta (Facebook/Instagram)",
    },
    source: {
      type: String,
      trim: true,
    },
    medium: {
      type: String,
      trim: true,
    },
    campaign: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    term: {
      type: String,
      trim: true,
    },
    landingPage: {
      type: String,
      trim: true,
    },
    referrer: {
      type: String,
      trim: true,
    },
    clickId: {
      type: String, // fbclid, gclid, etc.
      trim: true,
      sparse: true,
      index: true,
    },
    attributionModel: {
      type: String,
      enum: ["first_touch", "last_touch", "linear", "position_based"],
      default: "first_touch",
    },
    touchpointType: {
      type: String,
      enum: ["ad_click", "lead_ad_form", "website_enquiry", "appointment_booked", "payment_verified"],
      default: "lead_ad_form",
    },
    touchpointTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    attributedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

marketingAttributionSchema.index({ campaignCode: 1, touchpointTimestamp: -1 });

const MarketingAttribution = mongoose.model("MarketingAttribution", marketingAttributionSchema);

module.exports = MarketingAttribution;

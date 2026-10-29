const mongoose = require("mongoose");

const syncRecordSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ["success", "failed", "partial"], default: "success" },
    recordsProcessed: { type: Number, default: 0 },
    details: { type: String, trim: true },
  },
  { _id: true }
);

const integrationSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      enum: ["meta", "whatsapp", "google_calendar", "razorpay"],
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["connected", "disconnected", "test_mode", "error"],
      default: "test_mode",
    },
    config: {
      // WhatsApp Business Platform
      wabaId: { type: String, trim: true },
      phoneNumberId: { type: String, trim: true },
      businessPhoneNumber: { type: String, trim: true, default: "+91 917-277-2326" },
      verifyToken: { type: String, trim: true, default: "trigyna_meta_webhook_verify_token_2026" },
      
      // Meta Ads / Facebook / Instagram
      appId: { type: String, trim: true },
      pageId: { type: String, trim: true },
      instagramAccountId: { type: String, trim: true },
      adAccountId: { type: String, trim: true },
      webhookSubscriptionActive: { type: Boolean, default: true },

      // Calendar
      calendarId: { type: String, trim: true },
      syncDirection: { type: String, enum: ["bidirectional", "one_way_to_google", "one_way_from_google"], default: "bidirectional" },

      // Payment Gateway
      merchantId: { type: String, trim: true },
      webhookSecret: { type: String, trim: true },
    },
    tokenHealth: {
      isValid: { type: Boolean, default: true },
      expiresAt: { type: Date },
      lastChecked: { type: Date, default: Date.now },
    },
    lastSync: { type: Date, default: Date.now },
    lastError: { type: String, trim: true },
    syncHistory: [syncRecordSchema],
  },
  { timestamps: true }
);

const Integration = mongoose.model("Integration", integrationSchema);

module.exports = Integration;

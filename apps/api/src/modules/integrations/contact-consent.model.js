const mongoose = require("mongoose");

const consentHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["opt_in", "opt_out", "preference_update"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["whatsapp", "sms", "email", "all"],
      default: "whatsapp",
    },
    category: {
      type: String,
      enum: ["marketing", "transactional", "clinical", "all"],
      default: "marketing",
    },
    reason: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["user_action", "inbound_keyword", "portal_toggle", "staff_admin", "api"],
      default: "user_action",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
  },
  { _id: true }
);

const contactConsentSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    optInWhatsApp: {
      type: Boolean,
      default: true,
      index: true,
    },
    optInMarketing: {
      type: Boolean,
      default: true,
      index: true,
    },
    optInTransactional: {
      type: Boolean,
      default: true,
    },
    optInAppointmentReminders: {
      type: Boolean,
      default: true,
    },
    lastOptOutAt: {
      type: Date,
    },
    optOutReason: {
      type: String,
      trim: true,
    },
    history: [consentHistorySchema],
  },
  { timestamps: true }
);

contactConsentSchema.statics.isEligibleForMarketing = async function (phone) {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, "");
  const record = await this.findOne({ phone: clean });
  if (!record) return true; // Default opt-in unless explicitly suppressed
  return record.optInWhatsApp && record.optInMarketing;
};

contactConsentSchema.statics.isEligibleForTransactional = async function (phone) {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, "");
  const record = await this.findOne({ phone: clean });
  if (!record) return true;
  return record.optInWhatsApp && record.optInTransactional;
};

contactConsentSchema.statics.recordOptOut = async function (phone, reason = "User requested STOP", source = "inbound_keyword") {
  const clean = phone.replace(/\D/g, "");
  let record = await this.findOne({ phone: clean });
  if (!record) {
    record = new this({ phone: clean });
  }

  record.optInMarketing = false;
  record.lastOptOutAt = new Date();
  record.optOutReason = reason;
  record.history.push({
    action: "opt_out",
    channel: "whatsapp",
    category: "marketing",
    reason,
    source,
    timestamp: new Date(),
  });

  await record.save();
  return record;
};

contactConsentSchema.statics.recordOptIn = async function (phone, reason = "Explicit Consent Given", source = "user_action") {
  const clean = phone.replace(/\D/g, "");
  let record = await this.findOne({ phone: clean });
  if (!record) {
    record = new this({ phone: clean });
  }

  record.optInWhatsApp = true;
  record.optInMarketing = true;
  record.optInTransactional = true;
  record.history.push({
    action: "opt_in",
    channel: "whatsapp",
    category: "all",
    reason,
    source,
    timestamp: new Date(),
  });

  await record.save();
  return record;
};

const ContactConsent = mongoose.model("ContactConsent", contactConsentSchema);

module.exports = ContactConsent;


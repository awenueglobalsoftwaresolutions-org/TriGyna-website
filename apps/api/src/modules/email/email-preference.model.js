const mongoose = require("mongoose");

const emailPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Transactional emails (security, password reset, account verification) are mandatory for account safety
    transactional: {
      type: Boolean,
      default: true,
      immutable: true, // Cannot be set to false
    },
    appointments: {
      type: Boolean,
      default: true,
    },
    billing: {
      type: Boolean,
      default: true,
    },
    clinical: {
      type: Boolean,
      default: true,
    },
    marketing: {
      type: Boolean,
      default: false,
    },
    newsletter: {
      type: Boolean,
      default: false,
    },
    unsubscribeAll: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

emailPreferenceSchema.index({ email: 1, unsubscribeAll: 1 });

module.exports = mongoose.model("EmailPreference", emailPreferenceSchema);

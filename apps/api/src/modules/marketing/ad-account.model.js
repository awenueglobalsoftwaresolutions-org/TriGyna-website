const mongoose = require("mongoose");

const advertisingAccountSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["meta", "google", "other"],
      required: true,
      index: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    providerAccountId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessId: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    timeZone: {
      type: String,
      default: "Asia/Kolkata",
    },
    connectionStatus: {
      type: String,
      enum: ["connected", "disconnected", "token_expired", "error", "pending"],
      default: "connected",
      index: true,
    },
    encryptedAccessToken: {
      type: String,
      trim: true,
    },
    refreshToken: {
      type: String,
      trim: true,
    },
    developerToken: {
      type: String,
      trim: true,
    },
    tokenExpiryAt: {
      type: Date,
    },
    lastSyncAt: {
      type: Date,
      default: Date.now,
    },
    lastError: {
      type: String,
      trim: true,
    },
    permissions: [{ type: String, trim: true }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Method to safely return sanitized account data (never leak credentials)
advertisingAccountSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.encryptedAccessToken;
  delete obj.refreshToken;
  delete obj.developerToken;
  return obj;
};

const AdvertisingAccount = mongoose.model("AdvertisingAccount", advertisingAccountSchema);

module.exports = AdvertisingAccount;

const mongoose = require("mongoose");

const chartLinkOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "10m" }, // TTL index
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    isConsumed: {
      type: Boolean,
      default: false,
    },
    cooldownUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

chartLinkOtpSchema.index({ userId: 1, isConsumed: 1, expiresAt: 1 });

const ChartLinkOtp = mongoose.model("ChartLinkOtp", chartLinkOtpSchema);

module.exports = ChartLinkOtp;

const mongoose = require("mongoose");
const { ONBOARDING_STATUS, ALLOWED_ONBOARDING_STATUSES } = require("../../shared/consultation.constants");

const staffOnboardingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["doctor", "sales"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    onboardingStatus: {
      type: String,
      enum: ALLOWED_ONBOARDING_STATUSES,
      default: ONBOARDING_STATUS.ACCOUNT_CREATED,
      index: true,
    },
    emailStatus: {
      type: String,
      enum: ["pending", "queued", "sent", "delivered", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    whatsappStatus: {
      type: String,
      enum: ["pending", "queued", "sent", "delivered", "read", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    emailProviderMessageId: {
      type: String,
      trim: true,
      default: null,
    },
    whatsappProviderMessageId: {
      type: String,
      trim: true,
      default: null,
    },
    lastEmailError: {
      type: String,
      trim: true,
      default: null,
    },
    lastWhatsappError: {
      type: String,
      trim: true,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

staffOnboardingSchema.index({ role: 1, onboardingStatus: 1 });
staffOnboardingSchema.index({ createdAt: -1 });

const StaffOnboarding = mongoose.model("StaffOnboarding", staffOnboardingSchema);

module.exports = StaffOnboarding;

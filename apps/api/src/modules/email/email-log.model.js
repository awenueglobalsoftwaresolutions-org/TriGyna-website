const mongoose = require("mongoose");

const EMAIL_STATUSES = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "delivery_delayed",
  "bounced",
  "complained",
  "failed",
];

const emailLogSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: [true, "Recipient email is required"],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      index: true,
    },
    notificationType: {
      type: String,
      required: [true, "Notification type is required"],
      trim: true,
      index: true,
    },
    templateName: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Email subject is required"],
      maxlength: 300,
    },
    provider: {
      type: String,
      default: "resend",
      enum: ["resend", "smtp", "simulated"],
      index: true,
    },
    providerEmailId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: EMAIL_STATUSES,
      default: "queued",
      index: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    bouncedAt: {
      type: Date,
      default: null,
    },
    complainedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal query efficiency and high-volume filtering
emailLogSchema.index({ createdAt: -1, status: 1 });
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ notificationType: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, retryCount: 1, nextRetryAt: 1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);

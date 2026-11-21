const mongoose = require("mongoose");

/**
 * NotificationLog Schema
 * Auditable delivery log for Email, WhatsApp, and SMS notifications.
 */
const notificationLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "whatsapp", "sms", "in_app"],
      required: true,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    notificationType: {
      type: String,
      enum: [
        "payment_link",
        "payment_success",
        "payment_reminder",
        "payment_failed",
        "invoice_generated",
        "refund_processed",
      ],
      required: true,
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

notificationLogSchema.index({ createdAt: -1 });
notificationLogSchema.index({ recipient: 1, notificationType: 1, createdAt: -1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);

module.exports = NotificationLog;

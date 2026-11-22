const mongoose = require("mongoose");

const emailReminderSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    reminderType: {
      type: String,
      required: true,
      enum: ["48h", "24h", "2h", "followup_1d", "followup_3d", "followup_7d", "missed"],
      index: true,
    },
    targetTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "sent", "cancelled", "failed"],
      default: "scheduled",
      index: true,
    },
    sentAt: {
      type: Date,
    },
    emailLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailLog",
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Idempotent constraint: only one reminder of a given type per appointment
emailReminderSchema.index({ appointmentId: 1, reminderType: 1 }, { unique: true });

// Polling optimization index
emailReminderSchema.index({ status: 1, targetTime: 1 });

const EmailReminder = mongoose.model("EmailReminder", emailReminderSchema);

module.exports = EmailReminder;

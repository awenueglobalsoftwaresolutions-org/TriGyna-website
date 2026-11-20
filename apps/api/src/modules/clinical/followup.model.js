const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    followUpCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
      default: "Homoeopathic Care Review",
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledTime: {
      type: String,
      default: "11:30 AM - 12:00 PM",
    },
    mode: {
      type: String,
      enum: [
        "Online Video Consultation",
        "Video consultation",
        "Video Consultation",
        "In-Clinic Consultation",
        "In-Person Consultation",
        "Phone Follow-up",
        "Phone Consultation",
        "call",
        "whatsapp",
        "video",
        "in_person",
      ],
      default: "Online Video Consultation",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "completed",
        "missed",
        "rescheduled",
        "planned",
        "pending",
        "overdue",
        "cancelled",
        "in_progress",
      ],
      default: "scheduled",
      index: true,
    },
    interval: {
      type: String,
      enum: ["Day 1", "Day 3", "Day 7", "Day 14", "Day 21", "Day 30", "Custom"],
      default: "Day 14",
    },
    planInstructions: {
      type: String,
      trim: true,
      default: "Follow prescribed posology schedule and log symptoms in health diary.",
    },
    outcome: {
      type: String,
      trim: true,
    },
    outcomeNotes: {
      type: String,
      trim: true,
    },
    recoveryStatus: {
      type: String,
      enum: [
        "Improved",
        "Significantly Improved",
        "Stable",
        "No Improvement",
        "Requires Review",
        "Treatment Adjusted",
        "Referred",
        "Pending Review",
      ],
      default: "Pending Review",
    },
    symptoms: {
      type: String,
      trim: true,
    },
    clinicalObservations: {
      type: String,
      trim: true,
    },
    assignedStaff: {
      type: String,
      trim: true,
      default: "Dr. Ananya Sharma Clinical Care Team",
    },
    type: {
      type: String,
      enum: [
        "Review",
        "Test Review",
        "Progress",
        "Medication Review",
        "Investigation Review",
        "Routine Follow-up",
        "appointment",
        "call",
      ],
      default: "Review",
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "PCOS Management",
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Routine", "Medium", "High", "Urgent"],
      default: "Routine",
    },
    completionNotes: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reminderPreferences: {
      whatsappEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      pushEnabled: { type: Boolean, default: true },
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    missedReason: {
      type: String,
      trim: true,
    },
    missedAt: {
      type: Date,
    },
    rescheduleHistory: [
      {
        originalDate: Date,
        originalTime: String,
        newDate: Date,
        newTime: String,
        reason: String,
        rescheduledBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reminders: [
      {
        channel: {
          type: String,
          enum: ["whatsapp", "email", "sms"],
          default: "whatsapp",
        },
        status: {
          type: String,
          enum: ["scheduled", "sent", "delivered", "failed"],
          default: "scheduled",
        },
        scheduledFor: Date,
        sentAt: Date,
        messageId: String,
        recipient: String,
        content: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

followUpSchema.index({ patientId: 1, dueDate: 1 });
followUpSchema.index({ status: 1, dueDate: 1 });
followUpSchema.index({ doctorId: 1, dueDate: 1 });
followUpSchema.index({ doctorId: 1, status: 1, dueDate: 1 });
followUpSchema.index({ doctorId: 1, reason: 1 });
followUpSchema.index({ doctorId: 1, type: 1 });

const FollowUp = mongoose.model("FollowUp", followUpSchema);

module.exports = FollowUp;

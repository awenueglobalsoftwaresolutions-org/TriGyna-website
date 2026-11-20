const mongoose = require("mongoose");

const institutionalEventSchema = new mongoose.Schema(
  {
    eventCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "administrative",
        "doctor_session",
        "clinical_meeting",
        "health_camp",
        "audit",
        "training",
        "other",
      ],
      default: "administrative",
      index: true,
    },
    eventDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD (for multi-day events)
      default: null,
    },
    startTime: {
      type: String, // "09:00" or "09:00 AM"
      default: "09:00",
    },
    endTime: {
      type: String, // "10:00" or "10:00 AM"
      default: "10:00",
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
      index: true,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    branchName: {
      type: String,
      default: "Main Clinic",
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    location: {
      type: String,
      default: "TriGyna Healthcare Centre",
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    rescheduleHistory: [
      {
        previousDate: String,
        previousStartTime: String,
        previousEndTime: String,
        rescheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rescheduledAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    cancellationReason: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

institutionalEventSchema.index({ eventDate: 1, status: 1 });
institutionalEventSchema.index({ category: 1, eventDate: 1 });

const InstitutionalEvent = mongoose.models.InstitutionalEvent || mongoose.model("InstitutionalEvent", institutionalEventSchema);

module.exports = InstitutionalEvent;

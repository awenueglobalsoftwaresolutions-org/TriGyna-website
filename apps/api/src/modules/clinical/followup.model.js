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
      enum: ["Video consultation", "In-Clinic Consultation", "Phone Follow-up"],
      default: "Video consultation",
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "missed", "rescheduled", "planned", "pending"],
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
    assignedStaff: {
      type: String,
      trim: true,
      default: "Dr. Harshali Sutar Clinical Care Team",
    },
  },
  {
    timestamps: true,
  }
);

followUpSchema.index({ patientId: 1, dueDate: 1 });

const FollowUp = mongoose.model("FollowUp", followUpSchema);

module.exports = FollowUp;

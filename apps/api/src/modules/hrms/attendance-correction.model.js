const mongoose = require("mongoose");

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    workDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    originalCheckIn: {
      type: Date,
    },
    originalCheckOut: {
      type: Date,
    },
    requestedCheckIn: {
      type: Date,
      required: true,
    },
    requestedCheckOut: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNote: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

attendanceCorrectionSchema.index({ workDate: -1, createdAt: -1 });

const AttendanceCorrection = mongoose.model("AttendanceCorrection", attendanceCorrectionSchema);

module.exports = AttendanceCorrection;

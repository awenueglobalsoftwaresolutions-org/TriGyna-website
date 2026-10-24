const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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
      index: true,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "half_day", "absent", "leave"],
      default: "present",
    },
    correctionHistory: [
      {
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;

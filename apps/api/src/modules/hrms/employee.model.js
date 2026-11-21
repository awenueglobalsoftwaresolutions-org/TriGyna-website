const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      enum: ["Administration", "Clinical", "Reception", "CRM", "HR", "Finance"],
      default: "Administration",
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "consultant"],
      default: "full_time",
    },
    shift: {
      type: String,
      enum: ["general", "morning", "evening", "night"],
      default: "general",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "probation", "on_leave", "resigned", "terminated", "offboarded"],
      default: "active",
      index: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true },
    },
    leaveBalances: {
      casual: {
        total: { type: Number, default: 12 },
        used: { type: Number, default: 0 },
      },
      sick: {
        total: { type: Number, default: 10 },
        used: { type: Number, default: 0 },
      },
      earned: {
        total: { type: Number, default: 15 },
        used: { type: Number, default: 0 },
      },
      unpaid: {
        used: { type: Number, default: 0 },
      },
    },
    offboardingDetails: {
      exitDate: { type: Date },
      reason: { type: String, trim: true },
      handoverComplete: { type: Boolean, default: false },
      offboardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
  }
);

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;

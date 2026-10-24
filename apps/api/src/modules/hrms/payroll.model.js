const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    payrollPeriod: {
      type: String, // e.g. "2026-10"
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    baseSalary: {
      type: Number,
      required: true,
    },
    allowances: {
      hra: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      special: { type: Number, default: 0 },
    },
    deductions: {
      providentFund: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
    },
    workedDays: {
      type: Number,
      default: 26,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    grossPay: {
      type: Number,
      required: true,
    },
    netPay: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "reviewed", "approved", "locked", "paid"],
      default: "draft",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    paymentRef: {
      type: String,
      trim: true,
    },
    paymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

payrollSchema.index({ payrollPeriod: 1, employeeId: 1 }, { unique: true });

const Payroll = mongoose.model("Payroll", payrollSchema);

module.exports = Payroll;

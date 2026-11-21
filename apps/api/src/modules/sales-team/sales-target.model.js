const mongoose = require("mongoose");

const salesTargetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["individual", "team", "branch", "quarterly"],
      default: "individual",
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    branchName: {
      type: String,
      trim: true,
      index: true,
    },
    targetMetric: {
      type: String,
      enum: ["conversions", "leads", "revenue"],
      default: "conversions",
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    periodMonth: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },
    periodYear: {
      type: Number,
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

salesTargetSchema.index({ periodYear: 1, periodMonth: 1, targetType: 1 });

const SalesTarget = mongoose.model("SalesTarget", salesTargetSchema);

module.exports = SalesTarget;

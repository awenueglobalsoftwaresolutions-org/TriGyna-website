const mongoose = require("mongoose");

const salesTeamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
      index: true,
    },
    salesRole: {
      type: String,
      enum: ["Team Lead", "Sales Manager", "Senior Sales Executive", "Sales Executive"],
      default: "Sales Executive",
      trim: true,
    },
    isTeamLead: {
      type: Boolean,
      default: false,
      index: true,
    },
    branchName: {
      type: String,
      default: "Main Clinic",
      trim: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    monthlyTarget: {
      type: Number,
      default: 30,
      min: 0,
    },
    membershipStatus: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: false,
    },
    reportingManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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

salesTeamMemberSchema.index({ membershipStatus: 1, branchName: 1 });

const SalesTeamMember = mongoose.model("SalesTeamMember", salesTeamMemberSchema);

module.exports = SalesTeamMember;

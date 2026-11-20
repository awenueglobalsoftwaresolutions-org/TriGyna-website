const mongoose = require("mongoose");

const leadAssignmentHistorySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    previousAssignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    newAssignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignmentReason: {
      type: String,
      trim: true,
      default: "Manual assignment from Sales Team Workspace",
    },
    branchName: {
      type: String,
      trim: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

leadAssignmentHistorySchema.index({ assignedAt: -1 });

const LeadAssignmentHistory = mongoose.model("LeadAssignmentHistory", leadAssignmentHistorySchema);

module.exports = LeadAssignmentHistory;

const mongoose = require("mongoose");

const salesTeamSettingsSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      default: "TriGyna Sales & Growth Team",
      trim: true,
    },
    teamDescription: {
      type: String,
      default: "Manage sales representatives, track performance, targets and conversions.",
      trim: true,
    },
    teamLeaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    branch: {
      type: String,
      default: "All Branches",
    },
    monthlyTeamTarget: {
      type: Number,
      default: 100,
      min: 1,
    },
    defaultIndividualTarget: {
      type: Number,
      default: 30,
      min: 1,
    },
    assignmentRules: {
      type: String,
      enum: ["manual", "round_robin", "branch_based", "workload_balanced"],
      default: "manual",
    },
    performanceCalculationSettings: {
      attributionWindowDays: { type: Number, default: 90 },
      countReassignedConversionsTo: {
        type: String,
        enum: ["current_owner", "original_assignee", "converting_agent"],
        default: "current_owner",
      },
    },
    notificationPreferences: {
      notifyOnNewLead: { type: Boolean, default: true },
      notifyOnReassign: { type: Boolean, default: true },
      notifyOnTargetAchieved: { type: Boolean, default: true },
      channels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
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

const SalesTeamSettings = mongoose.model("SalesTeamSettings", salesTeamSettingsSchema);

module.exports = SalesTeamSettings;

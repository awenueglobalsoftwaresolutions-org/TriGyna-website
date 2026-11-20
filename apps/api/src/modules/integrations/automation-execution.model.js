const mongoose = require("mongoose");

const automationExecutionSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AutomationRule",
      required: true,
      index: true,
    },
    ruleName: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    triggerEvent: {
      type: String,
      required: true,
      index: true,
    },
    contactPhone: {
      type: String,
      index: true,
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "skipped", "failed"],
      required: true,
      index: true,
    },
    skipReason: {
      type: String,
      trim: true,
    },
    actionResults: [
      {
        actionType: String,
        status: String,
        result: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    error: {
      type: mongoose.Schema.Types.Mixed,
    },
    executedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

automationExecutionSchema.index({ contactPhone: 1, executedAt: -1 });
automationExecutionSchema.index({ ruleId: 1, executedAt: -1 });

const AutomationExecution = mongoose.model("AutomationExecution", automationExecutionSchema);

module.exports = AutomationExecution;


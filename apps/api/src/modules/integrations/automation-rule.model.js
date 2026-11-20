const mongoose = require("mongoose");

const conditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    operator: {
      type: String,
      enum: ["equals", "contains", "in", "not_equals", "exists", "greater_than"],
      required: true,
      default: "equals",
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "send_whatsapp_template",
        "send_whatsapp_text",
        "create_crm_activity",
        "create_task",
        "assign_lead",
        "notify_staff",
        "escalate_human",
        "stop_automation",
      ],
      required: true,
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const automationRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    triggerEvent: {
      type: String,
      required: true,
      enum: [
        "whatsapp.message.received",
        "whatsapp.conversation.created",
        "crm.lead.created",
        "crm.lead.assigned",
        "crm.lead.stage_changed",
        "crm.followup.due",
        "appointment.booked",
        "appointment.confirmed",
        "appointment.rescheduled",
        "appointment.cancelled",
        "appointment.reminder",
        "payment.captured",
        "invoice.issued",
        "consultation.finalized",
      ],
      index: true,
    },
    conditions: [conditionSchema],
    actions: [actionSchema],
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "21:00" }, // 9 PM
      end: { type: String, default: "09:00" },   // 9 AM
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    frequencyCap: {
      maxExecutionsPerContact: { type: Number, default: 3 },
      periodHours: { type: Number, default: 24 },
    },
    stopConditions: [
      {
        type: String,
        trim: true,
      },
    ],
    executionCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

automationRuleSchema.index({ enabled: 1, triggerEvent: 1 });

const AutomationRule = mongoose.model("AutomationRule", automationRuleSchema);

module.exports = AutomationRule;


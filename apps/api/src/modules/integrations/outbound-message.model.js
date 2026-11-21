const mongoose = require("mongoose");

const whatsappOutboundMessageSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    messageId: {
      type: String,
      sparse: true,
      index: true,
    },
    recipientPhone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    recipientName: {
      type: String,
      trim: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WhatsAppConversation",
      index: true,
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
    type: {
      type: String,
      enum: ["template", "text"],
      default: "template",
      index: true,
    },
    templateName: {
      type: String,
      trim: true,
    },
    languageCode: {
      type: String,
      default: "en_IN",
    },
    templateVariables: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    text: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["queued", "accepted", "sent", "delivered", "read", "failed"],
      default: "queued",
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    providerError: {
      type: mongoose.Schema.Types.Mixed,
    },
    initiator: {
      type: {
        type: String,
        enum: ["user", "automation", "campaign", "system", "test", "admin", "staff", "sales"],
        default: "system",
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
        trim: true,
      },
      campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaign",
      },
      ruleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AutomationRule",
      },
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

whatsappOutboundMessageSchema.index({ recipientPhone: 1, createdAt: -1 });
whatsappOutboundMessageSchema.index({ status: 1, createdAt: -1 });

const WhatsAppOutboundMessage = mongoose.model("WhatsAppOutboundMessage", whatsappOutboundMessageSchema);

module.exports = WhatsAppOutboundMessage;


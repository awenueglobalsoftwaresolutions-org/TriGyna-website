const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    sender: {
      type: String,
      enum: ["customer", "staff", "system"],
      required: true,
    },
    senderName: {
      type: String,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    templateName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["queued", "accepted", "sent", "delivered", "read", "failed"],
      default: "delivered",
    },
    mediaType: {
      type: String,
      enum: ["text", "image", "document", "audio", "video", "sticker", "interactive"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      trim: true,
    },
    mediaMetadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    interactiveData: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const whatsappConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
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
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "waiting", "closed"],
      default: "active",
      index: true,
    },
    isEscalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalationReason: {
      type: String,
      trim: true,
    },
    escalatedAt: {
      type: Date,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    serviceInterest: {
      type: String,
      trim: true,
      default: "Hair Treatment",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    starred: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    customerServiceWindowExpiresAt: {
      type: Date,
    },
    lastInboundMessageAt: {
      type: Date,
    },
    branch: {
      type: String,
      trim: true,
      default: "Prayagraj Clinic",
    },
    lastMessage: {
      text: { type: String, default: "" },
      sender: { type: String, enum: ["customer", "staff", "system"], default: "customer" },
      timestamp: { type: Date, default: Date.now },
    },
    messages: [chatMessageSchema],
    internalNotes: [internalNoteSchema],
  },
  { timestamps: true }
);

whatsappConversationSchema.index({ "lastMessage.timestamp": -1 });
whatsappConversationSchema.index({ assignedStaff: 1, status: 1 });

const WhatsAppConversation = mongoose.model("WhatsAppConversation", whatsappConversationSchema);

module.exports = WhatsAppConversation;

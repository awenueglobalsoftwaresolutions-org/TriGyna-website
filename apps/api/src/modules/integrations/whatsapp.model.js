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
      enum: ["sent", "delivered", "read", "failed"],
      default: "delivered",
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
    },
    status: {
      type: String,
      enum: ["active", "waiting", "closed"],
      default: "active",
      index: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
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

const WhatsAppConversation = mongoose.model("WhatsAppConversation", whatsappConversationSchema);

module.exports = WhatsAppConversation;

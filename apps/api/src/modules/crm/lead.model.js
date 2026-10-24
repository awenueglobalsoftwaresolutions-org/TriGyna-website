const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const crmTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "completed", "cancelled", "overdue"],
      default: "open",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const leadActivitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const stageHistorySchema = new mongoose.Schema(
  {
    fromStage: {
      type: String,
      trim: true,
    },
    toStage: {
      type: String,
      required: true,
      trim: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reason: {
      type: String,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const communicationSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["whatsapp", "sms", "email", "phone_call"],
      default: "phone_call",
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "outbound",
    },
    content: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    serviceInterest: {
      type: String,
      required: [true, "Service interest is required"],
      default: "Skin & Hair",
    },
    consultationMode: {
      type: String,
      enum: ["Online Video Consultation", "In-Clinic Consultation"],
      default: "Online Video Consultation",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    source: {
      type: String,
      default: "website_enquiry",
      index: true,
    },
    campaign: {
      type: String,
      trim: true,
    },
    utmSource: {
      type: String,
      trim: true,
    },
    utmMedium: {
      type: String,
      trim: true,
    },
    utmCampaign: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "interested",
        "qualified",
        "consultation_booked",
        "consultation_completed",
        "converted",
        "nurture",
        "lost",
        "assigned",
        "contact_attempted",
        "appointment_offered",
        "appointment_requested",
        "appointment_booked",
        "closed",
        "not_interested",
        "invalid",
      ],
      default: "new",
      index: true,
    },
    lostReason: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    followUpDate: {
      type: Date,
      index: true,
    },
    notes: [noteSchema],
    tasks: [crmTaskSchema],
    activities: [leadActivitySchema],
    stageHistory: [stageHistorySchema],
    communications: [communicationSchema],
    convertedPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    convertedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;

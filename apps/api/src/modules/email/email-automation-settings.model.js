const mongoose = require("mongoose");

const emailAutomationSettingsSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["auth", "appointments", "payments", "followups", "admin", "patients"],
      default: "appointments",
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    templateId: {
      type: String,
      required: true,
    },
    delayMinutes: {
      type: Number,
      default: 0,
    },
    recipientRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

const DEFAULT_AUTOMATIONS = [
  {
    eventType: "staff_onboarding_invitation",
    name: "Staff Registration Invitation",
    description: "Sends secure activation link and password setup to newly created staff",
    category: "auth",
    enabled: true,
    templateId: "staff_onboarding_invitation",
  },
  {
    eventType: "admin_registration",
    name: "Admin Registration Notification",
    description: "Sends credentials and permissions confirmation to new administrators",
    category: "admin",
    enabled: true,
    templateId: "admin_registration",
  },
  {
    eventType: "patient_welcome_registration",
    name: "Patient Welcome Registration",
    description: "Sends welcome message and portal links to newly registered patients",
    category: "patients",
    enabled: true,
    templateId: "patient_welcome_registration",
  },
  {
    eventType: "patient_form_submission",
    name: "Patient Form Submission Acknowledgment",
    description: "Sends reference number and receipt confirmation for website enquiries and health intake forms",
    category: "patients",
    enabled: true,
    templateId: "patient_form_submission",
  },
  {
    eventType: "appointment_scheduled",
    name: "Appointment Scheduled Confirmation",
    description: "Sends booking confirmation with doctor details and video consultation link",
    category: "appointments",
    enabled: true,
    templateId: "appointment_scheduled",
  },
  {
    eventType: "appointment_confirmed",
    name: "Appointment Confirmed",
    description: "Sends notification when medical team formally confirms slot",
    category: "appointments",
    enabled: true,
    templateId: "appointment_confirmed",
  },
  {
    eventType: "appointment_rescheduled",
    name: "Appointment Rescheduled",
    description: "Sends updated date, time, and doctor details when appointment is modified",
    category: "appointments",
    enabled: true,
    templateId: "appointment_rescheduled",
  },
  {
    eventType: "appointment_cancelled",
    name: "Appointment Cancelled",
    description: "Sends cancellation confirmation with polite reason and rebooking guidance",
    category: "appointments",
    enabled: true,
    templateId: "appointment_cancelled",
  },
  {
    eventType: "appointment_completed",
    name: "Appointment Completed Guidance",
    description: "Sends post-consultation care instructions, prescription link, and feedback request",
    category: "appointments",
    enabled: true,
    templateId: "appointment_completed",
  },
  {
    eventType: "appointment_reminder_48h",
    name: "Appointment Reminder (48 Hours)",
    description: "Scheduled consultation reminder 48 hours prior to start time",
    category: "appointments",
    enabled: true,
    templateId: "appointment_reminder",
    delayMinutes: 0,
  },
  {
    eventType: "appointment_reminder_24h",
    name: "Appointment Reminder (24 Hours)",
    description: "Scheduled consultation reminder 24 hours prior to start time",
    category: "appointments",
    enabled: true,
    templateId: "appointment_reminder",
    delayMinutes: 0,
  },
  {
    eventType: "appointment_reminder_2h",
    name: "Appointment Reminder (2 Hours)",
    description: "Immediate consultation reminder 2 hours prior with direct HD video room link",
    category: "appointments",
    enabled: true,
    templateId: "appointment_reminder",
    delayMinutes: 0,
  },
  {
    eventType: "followup_1d",
    name: "Care Follow-up (Day 1)",
    description: "Day-1 post-consultation health check-in",
    category: "followups",
    enabled: true,
    templateId: "appointment_followup",
  },
  {
    eventType: "followup_3d",
    name: "Care Follow-up (Day 3)",
    description: "Day-3 recovery and treatment adherence check-in",
    category: "followups",
    enabled: true,
    templateId: "appointment_followup",
  },
  {
    eventType: "followup_7d",
    name: "Care Follow-up (Day 7)",
    description: "Day-7 wellness progress review and next appointment scheduling",
    category: "followups",
    enabled: true,
    templateId: "appointment_followup",
  },
  {
    eventType: "missed_appointment",
    name: "Missed Appointment Notice",
    description: "Sent automatically when a patient does not attend scheduled video call",
    category: "followups",
    enabled: true,
    templateId: "missed_appointment",
  },
  {
    eventType: "payment_link_dispatch",
    name: "Payment Link Generated",
    description: "Sends secure Razorpay payment link with amount, due date, and instructions",
    category: "payments",
    enabled: true,
    templateId: "payment_link_dispatch",
  },
  {
    eventType: "payment_success_invoice",
    name: "Payment Receipt & PDF Tax Invoice",
    description: "Generates digital PDF tax invoice and emails patient immediately upon payment verification",
    category: "payments",
    enabled: true,
    templateId: "invoice_notification",
  },
  {
    eventType: "payment_failed",
    name: "Payment Attempt Failed Alert",
    description: "Notifies patient of failed transaction with secure retry button",
    category: "payments",
    enabled: true,
    templateId: "payment_failed",
  },
  {
    eventType: "refund_processed",
    name: "Refund Processed Notification",
    description: "Notifies patient when refund has been authorized with reference details",
    category: "payments",
    enabled: true,
    templateId: "refund_processed",
  },
];

emailAutomationSettingsSchema.statics.ensureDefaults = async function () {
  for (const item of DEFAULT_AUTOMATIONS) {
    await this.updateOne(
      { eventType: item.eventType },
      { $setOnInsert: item },
      { upsert: true }
    );
  }
};

const EmailAutomationSettings = mongoose.model(
  "EmailAutomationSettings",
  emailAutomationSettingsSchema
);

module.exports = EmailAutomationSettings;

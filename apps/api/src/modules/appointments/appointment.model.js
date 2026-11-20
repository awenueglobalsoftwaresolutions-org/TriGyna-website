const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    serviceName: {
      type: String,
      required: true,
      default: "Skin & Hair",
    },
    appointmentDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    startTime: {
      type: String, // "10:00"
      required: true,
    },
    endTime: {
      type: String, // "10:30"
      required: true,
    },
    mode: {
      type: String,
      enum: ["Online Video Consultation", "In-Clinic Consultation", "ONLINE_VIDEO"],
      default: "Online Video Consultation",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "checked_in",
        "waiting",
        "in_queue",
        "awaiting",
        "in_consultation",
        "in_progress",
        "completed",
        "cancelled",
        "rescheduled",
        "no_show",
      ],
      default: "scheduled",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    checkedInAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    bookingSource: {
      type: String,
      enum: ["website", "crm_conversion", "reception_walkin", "portal", "sales_onboarding"],
      default: "portal",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "waived"],
      default: "unpaid",
    },
    meetingProvider: {
      type: String,
      enum: ["google_meet", "zoom", "none"],
      default: "none",
    },
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },
    meetingStatus: {
      type: String,
      enum: ["pending", "ready", "invalid", "updated", "expired"],
      default: "pending",
    },
    meetingAddedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    meetingAddedAt: {
      type: Date,
    },
    meetingUpdatedAt: {
      type: Date,
    },
    isLegacy: {
      type: Boolean,
      default: false,
      index: true,
    },
    legacyPreserved: {
      type: Boolean,
      default: false,
    },
    requiresOnlineMigrationReview: {
      type: Boolean,
      default: false,
    },
    migrationReviewNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.pre("save", function (next) {
  if (this.isNew && !this.isLegacy) {
    if (this.mode !== "Online Video Consultation" && this.mode !== "ONLINE_VIDEO") {
      this.mode = "Online Video Consultation";
    }
  }
  next();
});

appointmentSchema.index({ appointmentDate: 1, doctorId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, createdAt: -1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;

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
      enum: ["Online Video Consultation", "In-Clinic Consultation"],
      default: "Online Video Consultation",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "checked_in",
        "waiting",
        "in_consultation",
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
      enum: ["website", "crm_conversion", "reception_walkin", "portal"],
      default: "portal",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "waived"],
      default: "unpaid",
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ appointmentDate: 1, doctorId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startTime: 1 });
appointmentSchema.index({ patientId: 1, createdAt: -1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;

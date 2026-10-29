const mongoose = require("mongoose");

const amendmentSchema = new mongoose.Schema(
  {
    amendedAt: { type: Date, default: Date.now },
    amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    previousDiagnosis: String,
    previousTreatmentPlan: String,
  },
  { _id: true }
);

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: false,
      sparse: true,
      index: true,
    },
    legacyAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
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
    chiefComplaints: {
      type: String,
      trim: true,
    },
    examinationNotes: {
      type: String,
      trim: true,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    treatmentPlan: {
      type: String,
      trim: true,
    },
    followUpAdvice: {
      type: String,
      trim: true,
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    finalizedAt: {
      type: Date,
    },
    amendments: [amendmentSchema],
  },
  {
    timestamps: true,
  }
);

consultationSchema.index({ patientId: 1, createdAt: -1 });

const Consultation = mongoose.model("Consultation", consultationSchema);

module.exports = Consultation;

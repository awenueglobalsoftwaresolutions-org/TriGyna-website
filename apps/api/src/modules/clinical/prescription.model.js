const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true }, // e.g. "30C", "200CH", "500mg"
    frequency: { type: String, required: true }, // e.g. "Twice daily", "TDS", "SOS"
    duration: { type: String, required: true }, // e.g. "14 days", "1 month"
    instructions: { type: String, trim: true }, // e.g. "Take 4 pills dry on tongue half hour before meals"
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
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
    medications: [medicationSchema],
    dietaryAdvice: {
      type: String,
      trim: true,
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    isReleasedToPatient: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });

const Prescription = mongoose.model("Prescription", prescriptionSchema);

module.exports = Prescription;

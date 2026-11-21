const mongoose = require("mongoose");

const interventionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    duration: { type: String, default: "30 days", trim: true },
    frequency: { type: String, trim: true },
    instructions: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "ongoing", "completed"],
      default: "ongoing",
    },
    completedAt: { type: Date },
  },
  { _id: true }
);

const progressNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const treatmentPlanSchema = new mongoose.Schema(
  {
    planCode: {
      type: String,
      unique: true,
      sparse: true,
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
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      index: true,
    },
    diagnosis: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Holistic Health & Constitutional Care Plan",
    },
    treatmentDescription: {
      type: String,
      trim: true,
    },
    interventions: [interventionSchema],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    duration: {
      type: String,
      default: "30 days",
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    reviewDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["draft", "active", "ongoing", "on_hold", "completed", "discontinued"],
      default: "active",
      index: true,
    },
    discontinueReason: {
      type: String,
      trim: true,
    },
    progressNotes: [progressNoteSchema],
  },
  {
    timestamps: true,
  }
);

treatmentPlanSchema.index({ patientId: 1, status: 1 });
treatmentPlanSchema.index({ createdAt: -1 });

const TreatmentPlan = mongoose.models.TreatmentPlan || mongoose.model("TreatmentPlan", treatmentPlanSchema);

module.exports = TreatmentPlan;


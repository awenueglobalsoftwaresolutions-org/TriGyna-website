const mongoose = require("mongoose");

const amendmentSchema = new mongoose.Schema(
  {
    amendedAt: { type: Date, default: Date.now },
    amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    previousDiagnosis: String,
    previousTreatmentPlan: String,
    previousExaminationNotes: String,
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, trim: true },
    pulse: { type: Number },
    temperature: { type: Number },
    respiratoryRate: { type: Number },
    spo2: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    bmi: { type: Number },
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    consultationCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
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
    consultationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    mode: {
      type: String,
      enum: ["Video Consultation", "In-Clinic Consultation", "Phone Follow-up", "Direct Visit"],
      default: "Video Consultation",
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ["draft", "in_progress", "pending_review", "finalized", "amended", "cancelled"],
      default: "in_progress",
      index: true,
    },
    chiefComplaints: {
      type: String,
      trim: true,
    },
    historyOfPresentIllness: {
      type: String,
      trim: true,
    },
    vitals: {
      type: vitalsSchema,
      default: () => ({}),
    },
    examinationNotes: {
      type: String,
      trim: true,
    },
    diagnosis: {
      type: String,
      trim: true,
      index: true,
    },
    secondaryDiagnoses: [{ type: String, trim: true }],
    diagnosisTags: [{ type: String, trim: true }],
    clinicalAssessment: {
      type: String,
      trim: true,
    },
    treatmentPlan: {
      type: String,
      trim: true,
    },
    treatmentPlanRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreatmentPlan",
    },
    prescriptionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    followUpAdvice: {
      type: String,
      trim: true,
    },
    followUpRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FollowUp",
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    recordHash: {
      type: String,
      trim: true,
    },
    amendments: [amendmentSchema],
  },
  {
    timestamps: true,
  }
);

consultationSchema.index({ patientId: 1, createdAt: -1 });
consultationSchema.index({ doctorId: 1, createdAt: -1 });
consultationSchema.index({ isFinalized: 1, createdAt: -1 });
consultationSchema.index({ consultationDate: -1 });

const Consultation = mongoose.models.Consultation || mongoose.model("Consultation", consultationSchema);

module.exports = Consultation;

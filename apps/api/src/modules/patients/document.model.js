const mongoose = require("mongoose");

const patientDocumentSchema = new mongoose.Schema(
  {
    documentCode: {
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
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
    },
    documentType: {
      type: String,
      enum: ["Lab Report", "Prescription", "Clinical Note", "ID Document", "Scan", "USG Report", "Other"],
      default: "Lab Report",
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
      default: 102400,
    },
    mimeType: {
      type: String,
      default: "application/pdf",
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    uploaderRole: {
      type: String,
      enum: ["patient", "doctor", "staff", "admin"],
      default: "patient",
    },
    status: {
      type: String,
      enum: ["verified", "pending_review", "archived"],
      default: "verified",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

patientDocumentSchema.index({ patientId: 1, createdAt: -1 });

const PatientDocument = mongoose.model("PatientDocument", patientDocumentSchema);

module.exports = PatientDocument;

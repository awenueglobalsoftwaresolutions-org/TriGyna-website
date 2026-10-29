const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    patientCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
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
    gender: {
      type: String,
      enum: ["female", "male", "other"],
      default: "female",
    },
    dateOfBirth: {
      type: Date,
    },
    age: {
      type: Number,
    },
    address: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    medicalHistory: {
      type: String,
      trim: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "merged", "archived"],
      default: "active",
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    mergedInto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ phone: 1, fullName: 1 });

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;

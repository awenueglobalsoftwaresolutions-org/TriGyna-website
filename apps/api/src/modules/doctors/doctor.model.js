const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialization: {
      type: [String],
      default: ["Homoeopathy", "Women's Wellness", "Dermatology & Hair Care"],
    },
    qualifications: {
      type: String,
      default: "BHMS, MD (Consultant Homoeopath)",
      trim: true,
    },
    consultationFee: {
      type: Number,
      default: 500,
    },
    bio: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "on_leave", "inactive"],
      default: "active",
      index: true,
    },
    workingHours: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday, 1 = Monday ...
        startTime: { type: String, default: "10:00" },
        endTime: { type: String, default: "18:00" },
        slotDurationMinutes: { type: Number, default: 30 },
      },
    ],
    availability: [
      {
        day: { type: String },
        slots: [{ type: String }],
      },
    ],
    branchName: {
      type: String,
      default: "Main Branch",
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    experienceYears: {
      type: String,
      default: "8+ Years",
      trim: true,
    },
    consultationModes: {
      type: [String],
      default: ["Online Video Consultation"],
    },
    supportedVideoProviders: {
      type: [String],
      default: ["google_meet", "zoom"],
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    registrationCouncil: {
      type: String,
      trim: true,
      default: "National Medical Commission",
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verificationNotes: {
      type: String,
      trim: true,
    },
    languages: {
      type: [String],
      default: ["English", "Hindi"],
    },
    avatarUrl: {
      type: String,
      default: "",
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    satisfactionRate: {
      type: Number,
      default: 98,
    },
    followUpSettings: {
      defaultInterval: { type: String, default: "Day 14" },
      defaultType: { type: String, default: "Review" },
      autoRemindWhatsApp: { type: Boolean, default: true },
      autoRemindEmail: { type: Boolean, default: true },
      autoRemindPush: { type: Boolean, default: true },
      leadTimeDays: { type: Number, default: 2 },
      allowDirectBooking: { type: Boolean, default: true },
      preferredConsultationMode: { type: String, default: "Online Video Consultation" },
    },
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;

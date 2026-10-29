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
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;

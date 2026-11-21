const mongoose = require("mongoose");

const slotReservationSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    appointmentDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    slotTime: {
      type: String, // "HH:mm" - 15-minute slice (e.g. "10:00", "10:15")
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "released"],
      default: "confirmed",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Strict unique index: Only ONE reservation can exist per doctor, date, and time slice.
// Prevents concurrent double-booking at the database engine level (WiredTiger atomic unique constraint).
slotReservationSchema.index(
  { doctorId: 1, appointmentDate: 1, slotTime: 1 },
  { unique: true }
);

const SlotReservation = mongoose.model("SlotReservation", slotReservationSchema);

module.exports = SlotReservation;

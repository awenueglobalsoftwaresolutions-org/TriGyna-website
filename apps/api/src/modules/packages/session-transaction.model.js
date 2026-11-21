const mongoose = require("mongoose");

const sessionTransactionSchema = new mongoose.Schema(
  {
    entitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entitlement",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    type: {
      type: String,
      enum: ["PURCHASE", "RESERVE", "CONSUME", "RELEASE"],
      required: true,
      index: true,
    },
    availableDelta: {
      type: Number,
      required: true,
    },
    reservedDelta: {
      type: Number,
      required: true,
    },
    consumedDelta: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      available: { type: Number, required: true },
      reserved: { type: Number, required: true },
      consumed: { type: Number, required: true },
    },
    reason: {
      type: String,
      trim: true,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

sessionTransactionSchema.index({ appointmentId: 1, type: 1 });

const SessionTransaction = mongoose.model("SessionTransaction", sessionTransactionSchema);
module.exports = SessionTransaction;


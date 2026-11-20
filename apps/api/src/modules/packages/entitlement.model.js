const mongoose = require("mongoose");

const entitlementSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    packageName: {
      type: String,
      required: true,
      trim: true,
    },
    totalSessions: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSessions: {
      type: Number,
      required: true,
      min: 0,
    },
    reservedSessions: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    consumedSessions: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "depleted", "expired"],
      default: "active",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    orderId: {
      type: String,
      trim: true,
    },
    paymentId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

entitlementSchema.index({ patientId: 1, status: 1, expiresAt: 1 });

const Entitlement = mongoose.model("Entitlement", entitlementSchema);
module.exports = Entitlement;


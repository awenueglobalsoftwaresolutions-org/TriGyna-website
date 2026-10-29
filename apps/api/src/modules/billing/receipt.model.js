const mongoose = require("mongoose");
const crypto = require("crypto");

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      index: true,
    },
    amountReceived: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      default: "UPI",
    },
    providerTransactionId: {
      type: String,
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    documentVersion: {
      type: Number,
      default: 1,
    },
    verificationToken: {
      type: String,
      default: () => crypto.randomBytes(16).toString("hex"),
      unique: true,
      index: true,
    },
    verificationTokenHash: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["issued", "cancelled", "refunded"],
      default: "issued",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Immutable Historical Snapshot Data (Section 10 Compliance)
    items: [
      {
        description: { type: String, required: true },
        details: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        amount: { type: Number, required: true },
      },
    ],
    patientSnapshot: {
      fullName: { type: String, trim: true },
      patientCode: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    doctorSnapshot: {
      name: { type: String, trim: true },
      qualifications: { type: String, trim: true },
      specialization: { type: String, trim: true },
    },
    appointmentSnapshot: {
      appointmentCode: { type: String, trim: true },
      serviceName: { type: String, trim: true },
      appointmentDate: { type: String, trim: true },
      startTime: { type: String, trim: true },
      endTime: { type: String, trim: true },
      mode: { type: String, trim: true },
      durationMinutes: { type: Number },
    },
    financialSnapshot: {
      subtotal: { type: Number },
      discountAmount: { type: Number },
      taxableAmount: { type: Number },
      taxRate: { type: Number },
      taxAmount: { type: Number },
      totalAmount: { type: Number },
      amountPaid: { type: Number },
      balanceAmount: { type: Number },
    },
    refundDetails: {
      refundAmount: { type: Number },
      refundReason: { type: String, trim: true },
      refundedAt: { type: Date },
      refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  {
    timestamps: true,
  }
);

receiptSchema.pre("save", function (next) {
  if (this.verificationToken && (!this.verificationTokenHash || this.isModified("verificationToken"))) {
    this.verificationTokenHash = crypto
      .createHash("sha256")
      .update(this.verificationToken)
      .digest("hex");
  }
  next();
});

receiptSchema.index({ createdAt: -1 });

const Receipt = mongoose.model("Receipt", receiptSchema);

module.exports = Receipt;

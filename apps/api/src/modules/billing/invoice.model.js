const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    unitPrice: {
      type: Number,
      default: function () {
        return this.amount || 0;
      },
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0, // e.g. 0 for exempt, 5, 12, 18
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true, // line total
    },
  },
  { _id: true }
);

const paymentRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "cash", "bank_transfer", "netbanking", "wallet"],
      required: true,
    },
    paymentProvider: {
      type: String,
      default: "upi",
    },
    transactionRef: {
      type: String,
      trim: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    legacyAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      index: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    subtotal: {
      type: Number,
      default: function () {
        return this.totalAmount || 0;
      },
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    taxableAmount: {
      type: Number,
      default: function () {
        return (this.subtotal || this.totalAmount || 0) - (this.discountAmount || 0);
      },
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: function () {
        return this.totalAmount - (this.paidAmount || 0);
      },
    },
    status: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    items: [invoiceItemSchema],
    payments: [paymentRecordSchema],
    paymentMethod: {
      type: String,
      default: "none",
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    refundDetails: {
      refundAmount: { type: Number },
      refundReason: { type: String, trim: true },
      refundedAt: { type: Date },
      refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ patientId: 1, createdAt: -1 });

invoiceSchema.virtual("invoiceCode").get(function () {
  return this.invoiceNumber;
});

invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;

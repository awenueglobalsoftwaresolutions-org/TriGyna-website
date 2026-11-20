const mongoose = require("mongoose");
const crypto = require("crypto");

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
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
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
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      index: true,
    },
    branchName: {
      type: String,
      default: "Main Clinic (Pune - Baner)",
      trim: true,
    },
    invoiceType: {
      type: String,
      enum: ["consultation", "service", "package", "follow-up", "procedure", "other"],
      default: "consultation",
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
    taxBreakdown: {
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: function () {
        return Math.max(0, this.totalAmount - (this.paidAmount || 0));
      },
    },
    status: {
      type: String,
      enum: ["draft", "issued", "pending", "partially_paid", "paid", "overdue", "cancelled", "refunded", "partially_refunded", "void"],
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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    organizationSnapshot: {
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      gstin: { type: String, trim: true },
    },
    notes: {
      type: String,
      trim: true,
    },
    verificationToken: {
      type: String,
      default: () => crypto.randomBytes(16).toString("hex"),
      unique: true,
      sparse: true,
      index: true,
    },
    verificationTokenHash: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.pre("save", function (next) {
  if (this.verificationToken && (!this.verificationTokenHash || this.isModified("verificationToken"))) {
    this.verificationTokenHash = crypto
      .createHash("sha256")
      .update(this.verificationToken)
      .digest("hex");
  }
  next();
});

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ doctorId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, createdAt: -1 });

invoiceSchema.virtual("invoiceCode").get(function () {
  return this.invoiceNumber;
});

invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;

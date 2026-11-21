const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Medical Supplies",
        "Utilities",
        "Salaries",
        "Rent",
        "Equipment",
        "Marketing",
        "Maintenance",
        "Miscellaneous",
      ],
      default: "Medical Supplies",
    },
    amount: {
      type: Number,
      required: true,
    },
    vendor: {
      type: String,
      trim: true,
    },
    expenseDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "card", "upi", "cash"],
      default: "bank_transfer",
    },
    receiptRef: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "paid",
    },
    recordedBy: {
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

expenseSchema.index({ expenseDate: -1, createdAt: -1 });

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerAccountV2" },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  date: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  sendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  proof: { type: String },
  type: { type: String, enum: ["Received", "Sent"] },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  description: { type: String },
  invoice: {
    number: { type: String },
    path: { type: String },
  },
  timestamp: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;

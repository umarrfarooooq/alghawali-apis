const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  amount: { type: Number },
  receivedFrom: { type: String },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  paymentMethod: { type: String },
  transferTo: { type: String },
  sendedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  sendedTo: { type: String },
  type: { type: String, enum: ["Received", "Sent"] },
  date: { type: Date, default: Date.now },
  proof: { type: String },
  approved: { type: Boolean, default: false },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  timestamp: { type: Date, default: Date.now },
});

const staffAccountSchema = new mongoose.Schema({
  staffName: { type: String, required: true },
  staffCode: { type: String, required: true },
  staffRoles: [
    {
      type: Number,
      default: 0,
    },
  ],
  staffId: { type: String },
  balance: { type: Number, default: 0 },
  totalReceivedAmount: { type: Number, default: 0 },
  totalSentAmount: { type: Number, default: 0 },
  pendingReceivedAmount: { type: Number, default: 0 },
  pendingSentAmount: { type: Number, default: 0 },
  transferAmount: { type: Number, default: 0 },
  transferHistory: [transactionSchema],
  accountHistory: [transactionSchema],
  pendingApprovals: [transactionSchema],
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
  timestamp: { type: Date, default: Date.now },
});

const StaffAccount = mongoose.model("StaffAccount", staffAccountSchema);

module.exports = StaffAccount;

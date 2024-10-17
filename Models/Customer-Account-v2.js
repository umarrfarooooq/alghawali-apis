const mongoose = require("mongoose");

const accountHistorySchema = new mongoose.Schema({
  receivedAmount: { type: Number, default: 0 },
  returnAmount: { type: Number, default: 0 },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  sendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  paymentMethod: { type: String },
  date: { type: Date, default: Date.now },
  paymentProof: { type: String },
  approved: { type: Boolean, default: false },
  staffAccount: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  pendingTransactionId: { type: mongoose.Schema.Types.ObjectId },
  isMonthlyPayment: { type: Boolean, default: false },
  monthlyPeriodCovered: { type: String },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  timestamp: { type: Date, default: Date.now },
});

const customerAccountSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNo: { type: String, required: true },
  maid: { type: mongoose.Schema.Types.ObjectId, ref: "Maid", required: true },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StaffAccount",
    required: true,
  },
  totalAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  pendingReceivedAmount: { type: Number, default: 0 },
  returnAmount: { type: Number, default: 0 },
  pendingReturnAmount: { type: Number, default: 0 },
  uniqueCode: { type: String, required: true },
  services: {
    a2aFullPackage: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    a2aTicket: { type: Number, default: 0 },
    visaChange: { type: Number, default: 0 },
    uniform: { type: Number, default: 0 },
    other: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
  },
  visaChangeAmount: { type: Number, default: 0 },
  uniformAmount: { type: Number, default: 0 },
  officeCharges: { type: Number, default: 0 },
  profileHiringStatus: {
    type: String,
    enum: ["Hired", "Monthly Hired", "Return", "On Trial", "Completed"],
    default: "On Trial",
  },
  cosPaymentStatus: {
    type: String,
    enum: ["Fully Paid", "Partially Paid", "Partially Refunded", "Refunded"],
    default: "Partially Paid",
  },
  isMonthlyHiring: { type: Boolean, default: false },
  hiringDate: { type: Date },
  monthlyHiringDuration: { type: Number },
  monthlyHireStartDate: { type: Date },
  monthlyHireEndDate: { type: Date },
  trialStartDate: { type: Date },
  trialEndDate: { type: Date },
  trialStatus: { type: String, enum: ["Active", "Expired"], default: "Active" },
  trialAction: {
    type: String,
    enum: ["Permanent", "Replace", "Return"],
    default: "Permanent",
  },
  accountHistory: [accountHistorySchema],
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
  timestamp: { type: Date, default: Date.now },
});

const CustomerAccountV2 = mongoose.model(
  "CustomerAccountV2",
  customerAccountSchema
);

module.exports = CustomerAccountV2;

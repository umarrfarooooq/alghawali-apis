const mongoose = require('mongoose');

const accountHistorySchema = new mongoose.Schema({
  receivedAmount: { type: Number, default: 0},
  officeCharges:{ type: Number },
  returnAmount: { type: Number, default: 0},
  receivedBy: { type: String, required: false },
  sendedBy: { type: String },
  paymentMethod: { type: String },
  date: { type: Date, default: Date.now },
  paymentProof: { type: String },
  approved: { type: Boolean, default: false },
  staffAccount : String,
  pendingStaffId : String,
  isMonthlyPayment: { type: Boolean, default: false },
  monthlyPeriodCovered: { type: String }
});

const customerAccountSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNo: { type: String, required: true },
  profileName: { type: String, required: true },
  profileId: { type: String },
  staffId: { type: String },
  profileCode: { type: String, required: true },
  totalAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  returnAmount: { type: Number,  default: 0},
  uniqueCode: { type: String, required: true },
  profileHiringStatus: { type: String, enum: ['Hired', 'MonthlyHired', 'Replaced', 'Return'], default: 'Hired' },
  cosPaymentStatus: { type: String, enum: ['Fully Paid', 'Partially Paid'], default: 'Partially Paid' },
  isMonthlyHiring: { type: Boolean, default: false },
  monthlyHiringDuration: { type: Number },
  monthlyHireStartDate: { type: Date },
  monthlyHireEndDate: { type: Date },
  monthlyPaymentStatus: { type: String, enum: ['Up to Date', 'Overdue'], default: 'Up to Date' },
  accountHistory: [accountHistorySchema],
  timestamp: { type: Date, default: Date.now }
});

const CustomerAccount = mongoose.model('CustomerAccount', customerAccountSchema);

module.exports = CustomerAccount;

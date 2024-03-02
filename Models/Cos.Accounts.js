const mongoose = require('mongoose');

const accountHistorySchema = new mongoose.Schema({
  receivedAmount: { type: Number},
  officeCharges:{ type: Number },
  returnAmount: { type: Number},
  receivedBy: { type: String, required: false },
  sendedBy: { type: String },
  paymentMethod: { type: String, required: true },
  date: { type: Date, default: Date.now },
  paymentProof: { type: String, required : true },
  staffAccount : String,
});

const customerAccountSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNo: { type: String, required: true },
  profileName: { type: String, required: true },
  profileId: { type: String },
  profileCode: { type: String, required: true },
  totalAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  returnAmount: { type: Number},
  uniqueCode: { type: String, required: true },
  profileHiringStatus: { type: String, enum: ['Hired', 'Replaced', 'Return'], default: 'Hired' },
  cosPaymentStatus: { type: String, enum: ['Fully Paid', 'Partially Paid'], default: 'Partially Paid' },
  accountHistory: [accountHistorySchema],
  timestamp: { type: Date, default: Date.now }
});

const CustomerAccount = mongoose.model('CustomerAccount', customerAccountSchema);

module.exports = CustomerAccount;

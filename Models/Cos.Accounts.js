const mongoose = require('mongoose');

const accountHistorySchema = new mongoose.Schema({
  receivedAmount: { type: Number, required: true },
  receivedBy: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  date: { type: Date, default: Date.now },
  paymentProof: { type: String, required:true }
});

const customerAccountSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNo: { type: String, required: true },
  profileName: { type: String, required: true },
  profileId: { type: String, required: true },
  totalAmount: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  uniqueCode: { type: String, required: true },
  profileHiringStatus: { type: String, enum: ['Hired', 'Replaced', 'Return'], default: 'Hired' },
  accountHistory: [accountHistorySchema],
  timestamp: { type: Date, default: Date.now }
});

const CustomerAccount = mongoose.model('CustomerAccount', customerAccountSchema);

module.exports = CustomerAccount;

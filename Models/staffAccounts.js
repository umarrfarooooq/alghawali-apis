const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { type: Number },
  receivedFrom : {type : String},
  paymentMethod:  {type : String},
  transferTo: {type: String},
  sendedTo: {type: String},
  type: { type: String, enum: ['Received', 'Sent'] },
  date: { type: Date, default: Date.now },
  proof: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const staffAccountSchema = new mongoose.Schema({
  staffName: { type: String, required: true },
  staffCode: { type: String, required: true },
  staffId: {type: String},
  balance: { type: Number, default: 0 },
  totalReceivedAmount: { type: Number, default: 0 },
  totalSentAmount: { type: Number, default: 0 },
  transferAmount: { type: Number, default: 0 },
  transferHistory: [transactionSchema],
  accountHistory: [transactionSchema],
  timestamp: { type: Date, default: Date.now }
});

const StaffAccount = mongoose.model('StaffAccount', staffAccountSchema);

module.exports = StaffAccount;

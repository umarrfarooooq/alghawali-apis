const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { type: Number },
  receivedFrom : {type : String},
  receivedBy : {type : String},
  requestedBy : {type : String},
  paymentMethod:  {type : String},
  transferTo: {type: String},
  sendedFrom: {type: String},
  sendedTo: {type: String},
  type: { type: String, enum: ['Received', 'Sent'] },
  date: { type: Date, default: Date.now },
  proof: { type: String, required: true },
  approved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const staffAccountSchema = new mongoose.Schema({
  staffName: { type: String, required: true },
  staffCode: { type: String, required: true },
  staffRoles: [{
    type: Number,
    default: 0
  }],
  staffId: {type: String},
  balance: { type: Number, default: 0 },
  totalReceivedAmount: { type: Number, default: 0 },
  totalSentAmount: { type: Number, default: 0 },
  transferAmount: { type: Number, default: 0 },
  transferHistory: [transactionSchema],
  accountHistory: [transactionSchema],
  pendingApprovals: [transactionSchema],
  timestamp: { type: Date, default: Date.now }
});

const StaffAccount = mongoose.model('StaffAccount', staffAccountSchema);

module.exports = StaffAccount;

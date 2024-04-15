const mongoose = require('mongoose');

const UpdatePaymentHistorySchema = new mongoose.Schema({
  paymentMethod: String,
  totalAmount: Number,
  receivedAmoount: Number,
  receivedBy:String,
  paySlip:String,
  approved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const hiringSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  maidId:{
    type: String,
    required: true
  },
  paymentMethod:{
    type: String,
    required: true
  },
  receivedBy:{
    type: String,
    required: false
  },
  hiringDate:{
    type: Date,
    required:true
  },
  totalAmount:{
    type: Number,
    required: true
  },
  advanceAmount:{
    type: Number,
    required: true
  },
  returnAmount:{
    type: Number
  },
  officeCharges:{
    type: Number
  },
  cosPhone:{
    type: Number,
    required: true
  },
  hiringSlip:{
    type: String,
    required: true
  },
  hiringBy:{
    type: String,
    required: false
  },
  hiringStatus:{
    type: Boolean,
    required:true
  },
  unHiringReason:{
    type: String
  },
  paymentHistory:[UpdatePaymentHistorySchema],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hiring', hiringSchema);

const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userPhoneNumber: {
    type: String,
    required: true,
  },
  interviewDate: {
    type: Date,
    default: Date.now,
  },
  maidId:{
    type: String,
    required: true
  },
  maidName:{
    type: String,
    required: true
  },
  maidImage:String,
  clientEmail:{
    type: String,
    required: false
  },
  Status:{
    type:String,
    default:"Pending"
  },
  timestamp: { type: Date, default: Date.now }
});

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;

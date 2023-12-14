const mongoose = require('mongoose');

const hiringSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  maidId:{
    type: String,
    required: true
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
  cosPhone:{
    type: Number,
    required: true
  },
  hiringSlip:{
    type: String,
    required: false
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

  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hiring', hiringSchema);

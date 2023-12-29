const mongoose = require('mongoose');

const ExtensionSchema = new mongoose.Schema({
    newVisaEntryDate: Date,
    newVisaEndDate: Date,
    visaFile: String,
    timestamp: { type: Date, default: Date.now }
  });


const visaSchema = new mongoose.Schema({
  maidName: {
    type: String,
    required: true,
  },
  dateEntry: {
    type: Date,
    required: true,
  },
  visaEndTime: {
    type: Date,
    required: true,
  },
  extendedTime: {
    type: Number,
    default: 0,
  },
  visaFile: {
    type: String,
    required: true,
  },
  maidImage: {
    type: String,
    required: true,
  },
  hiringStatus:{
    type: Boolean,
    default: false
  },
  extensionHistory: [ExtensionSchema],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Visa = mongoose.model('Visa', visaSchema);

module.exports = Visa;

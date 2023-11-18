const mongoose = require("mongoose");

const maidSchema = new mongoose.Schema({
    code: {
      type: String,
      required: true,
    },
    name:  {
      type: String,
      required: true,
    },
    nationality: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: false,
    },
    salery: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: false,
    },
    religion: {
      type: String,
      required: true,
    },
    maritalStatus: {
      type: String,
      required: true,
    },
    childrens: {
      type: Number,
      required: false,
    },
    age: {
      type: Number,
      required: true,
    },
    education: {
      type: String,
      required: true,
    },
    languages: {
      type: Array,
      required: true,
    },
    contractPeriod: {
    type: String,
    required: true,
  },
    remarks: {
    type: String,
    required: true,
  },
    addedBy: {
    type: String,
    required: false,
  },
    maidImg: {
    type: String,
    required: true,
  },
    maidImg2: {
    type: String,
  },
    maidImg3: {
    type: String,
  },
    maidImg4: {
    type: String,
  },
    videoLink: {
    type: String,
  },
    appliedFor: {
    type: String,
    required: true,
  },
    experience: {
    type: String,
  },
    isHired: {
      type: Boolean,
      default: false
    },
    timestamp: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model('Maid', maidSchema);
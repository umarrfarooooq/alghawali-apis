const mongoose = require("mongoose");

const customRequirements = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
    category: {
      type: String,
      required: true,
    },
    nationality: {
      type: String,
      required: true,
    },
    languages: {
      type: Array,
    },
    religion: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    maritalStatus: {
      type: String,
      required: true,
    },
    pendingStatus: {
      type: String,
      default: "pending",
    },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CustomRequirements', customRequirements);

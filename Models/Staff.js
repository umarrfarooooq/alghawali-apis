const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  image: String,
  roles: [{
    type: Number,
    default: 0
  }],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Staff', staffSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phNumber: Number,
  password: String,
  admin: {
    type: Boolean,
    default: false
  },
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const agentRegistrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  number: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  nationality: {
    type: String,
    required: true,
    trim: true
  },
  idCardFront: {
    type: String,
    required: true
  },
  idCardBack: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const AgentRegistration = mongoose.model('AgentRegistration', agentRegistrationSchema);

module.exports = AgentRegistration;
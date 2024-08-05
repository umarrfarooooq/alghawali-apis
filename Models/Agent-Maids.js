const mongoose = require("mongoose");

const agentMaidRequestSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
    required: true,
  },
  maidName: {
    type: String,
    required: true,
  },
  maidImage: {
    type: String,
    required: true,
  },
  maidVideo: {
    type: String,
  },
  maidPassportFront: {
    type: String,
    required: true,
  },
  maidPassportBack: {
    type: String,
    required: false,
  },
  maritalStatus: {
    type: String,
    required: true,
    enum: ["Single", "Married", "Divorced", "Widowed"],
  },
  numberOfChildren: {
    type: String,
  },
  experience: {
    years: {
      type: String,
    },
    country: {
      type: String,
    },
  },
  religion: {
    type: String,
    required: true,
  },
  languages: {
    type: [String],
    required: true,
  },
  education: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const AgentMaidRequest = mongoose.model(
  "AgentMaidRequest",
  agentMaidRequestSchema
);

module.exports = AgentMaidRequest;

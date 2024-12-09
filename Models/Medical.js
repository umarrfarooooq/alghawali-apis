const mongoose = require("mongoose");

const medicalSchema = new mongoose.Schema({
  maidName: {
    type: String,
    required: true,
  },
  entryDate: {
    type: Date,
    required: true,
  },
  passportNo: {
    type: String,
  },
  medicalStatus: {
    type: String,
    enum: ["in process", "to be done", "unfit", "done", "proceed to moh"],
    default: "to be done",
  },
  medicalDate: {
    type: Date,
  },
  medicalFile: {
    type: String,
  },
  mohFile: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Medical = mongoose.model("Medical", medicalSchema);

module.exports = Medical;

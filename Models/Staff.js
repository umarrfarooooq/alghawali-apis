const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  phoneNumber: String,
  password: {
    type: String,
    required: false,
  },
  image: String,
  roles: [
    {
      type: Number,
      default: 0,
    },
  ],
  adminKnows: {
    type: Boolean,
    default: true,
  },
  staffAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "StaffAccount" },
  invitationToken: String,
  invitationTokenExpiry: Date,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Staff", staffSchema);

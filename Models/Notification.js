const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "TRIAL_EXPIRED",
        "MONTHLY_HIRE_EXPIRED",
        "PAYMENT_RECEIVED",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    maid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maid",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerAccountV2",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    }
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

notificationSchema.statics.createNotification = async function({
  recipientId,
  type,
  title,
  message,
  maidId,
  customerId = null,
  actionUrl = null,
  metadata = {}
}) {
  return this.create({
    recipient: recipientId,
    type,
    title,
    message,
    maid: maidId,
    customer: customerId,
    actionUrl,
    metadata
  });
};

notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  return this.save();
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
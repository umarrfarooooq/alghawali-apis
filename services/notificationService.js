const Notification = require("../Models/Notification");

const createTrialExpiryNotification = async ({ maid, customer, staffId }) => {
  return Notification.createNotification({
    recipientId: staffId,
    type: "TRIAL_EXPIRED",
    title: "Trial Period Expired",
    message: `Trial period has expired for maid: ${maid.name} (${maid.code})`,
    maidId: maid._id,
    customerId: customer._id,
  });
};

const createMonthlyHireExpiryNotification = async ({
  maid,
  customer,
  staffId,
}) => {
  return Notification.createNotification({
    recipientId: staffId,
    type: "MONTHLY_HIRE_EXPIRED",
    title: "Monthly Hire Expired",
    message: `Monthly hire period has expired for maid: ${maid.name} (${maid.code})`,
    maidId: maid._id,
    customerId: customer._id,
  });
};

const getUnreadNotifications = async (staffId) => {
  return Notification.find({
    recipient: staffId,
    isRead: false,
  })
    .sort({ createdAt: -1 })
    .populate("maid", "name photo")
    .populate("customer", "customerName phoneNo")
    .lean();
};

const getAllNotifications = async (staffId, options) => {
  const { page, limit, type, isRead } = options;

  const query = { recipient: staffId };

  if (type) query.type = type;
  if (typeof isRead === "boolean") query.isRead = isRead;

  try {
    const total = await Notification.countDocuments(query);

    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("maid", "name maidImg")
      .populate("customer", "customerName phoneNo")
      .lean();

    return {
      notifications,
      currentPage: page,
      totalPages,
      total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  } catch (error) {
    console.error("Error in getAllNotifications:", error);
    throw error;
  }
};

const markAsRead = async (notificationId, staffId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: staffId,
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification.markAsRead();
};

const markAllAsRead = async (staffId) => {
  return Notification.updateMany(
    {
      recipient: staffId,
      isRead: false,
    },
    {
      isRead: true,
    }
  );
};

const createPaymentReceivedNotification = async ({
  staff,
  customer,
  maid,
  amount,
}) => {
  return Notification.createNotification({
    recipientId: staff._id,
    type: "PAYMENT_RECEIVED",
    title: "New Payment Received",
    message: `Payment of OMR ${amount} received for maid ID: ${maid.name}`,
    maidId: maid._id,
    customerId: customer._id,
    actionUrl: `/customer-details/${customer._id}`,
    metadata: {
      amount,
    },
  });
};

module.exports = {
  createTrialExpiryNotification,
  createMonthlyHireExpiryNotification,
  createPaymentReceivedNotification,
  getUnreadNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
};

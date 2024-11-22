const NotificationService = require("../services/notificationService");

exports.getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await NotificationService.getUnreadNotifications(
      req.staffAccountId
    );
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, isRead } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || undefined,
      isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
    };

    const result = await NotificationService.getAllNotifications(
      req.staffAccountId,
      options
    );

    res.status(200).json({
      notifications: result.notifications,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalNotifications: result.total,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await NotificationService.markAsRead(notificationId, req.staffAccountId);
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.staffAccountId);
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};

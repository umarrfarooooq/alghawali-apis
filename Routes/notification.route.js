const express = require("express");
const router = express.Router();
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const {
  getUnreadNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.use(verifyStaffToken);

router.get("/unread", getUnreadNotifications);

router.get("/", getAllNotifications);

router.patch("/:notificationId/read", markAsRead);

router.patch("/mark-all-read", markAllAsRead);

module.exports = router;

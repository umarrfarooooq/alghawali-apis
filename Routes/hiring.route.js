const express = require("express");
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const hiringController = require("../controllers/hiringController");

router.post(
  "/:id",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  upload.single("paymentSlip"),
  hiringController.createHiringOrTrial
);



module.exports = router;

const express = require("express");
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const hiringController = require("../controllers/hiringController");

router.post(
  "/return",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  hiringController.returnMaid
);
router.post(
  "/replace",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  hiringController.replaceMaid
);
router.post(
  "/update-payment",
  verifyStaffToken,
  upload.single("paymentSlip"),
  checkPermission(roles.canAccessOnAccounts),
  hiringController.updateCustomerPayment
);
router.post(
  "/unhire-maid/:maidId",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  hiringController.unhireMaid
);
router.post(
  "/:id",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  upload.single("paymentSlip"),
  hiringController.createHiringOrTrial
);

module.exports = router;

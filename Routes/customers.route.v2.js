const express = require("express");
const router = express.Router();
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const customerController = require("../controllers/customersControllerV2");

router.get(
  "/all",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  customerController.getAllAccounts
);

router.get(
  "/my/all",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  customerController.getAllAccountsForUser
);
router.get(
  "/expired-trial",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  customerController.getAllExpiredTrialAccounts
);

router.get(
  "/my/expired-trial",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  customerController.getExpiredTrialAccountsForUser
);

router.get(
  "/pending-to-recieve-dues",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  customerController.getPendingDuesToReceive
);

router.get(
  "/my/pending-to-recieve-dues",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  customerController.getPendingDuesToReceiveForUser
);

router.get(
  "/pending-to-sent-dues",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  customerController.getPendingDuesToSend
);

router.get(
  "/my/pending-to-sent-dues",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  customerController.getPendingDuesToSendForUser
);

router.get(
  "/cleared-payment",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  customerController.getClearedPaymentsCustomers
);

router.get(
  "/my/cleared-payment",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  customerController.getClearedPaymentsCustomersForUser
);

module.exports = router;

const express = require("express");
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const costumersAccountController = require("../controllers/cos.accountsController");

router.post(
  "/hiring/:id",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  upload.single("hiringSlip"),
  costumersAccountController.createHiring
);
router.get(
  "/all",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  costumersAccountController.getAllAccounts
);
router.get(
  "/all/v2",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  costumersAccountController.getAllAccountsV2
);
router.get(
  "/my-customers/:staffId",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  costumersAccountController.getMyCustomerAccounts
);

router.get(
  "/accountsSummary",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  costumersAccountController.getAllAccountsSummary
);
router.get(
  "/maid/:maidId",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  costumersAccountController.getAccountByMaidId
);
router.put(
  "/payment/update/:id",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  upload.single("paymentProof"),
  costumersAccountController.updateHiringAndPaymentById
);
router.post(
  "/unHiring/:id",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  upload.single("paymentProof"),
  costumersAccountController.listMaidAgain
);
router.put(
  "/update-account-payment/:accountId",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  upload.single("paymentProof"),
  costumersAccountController.updatePartialPaymentFromAccount
);

module.exports = router;

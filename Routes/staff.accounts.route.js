const express = require("express");
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const staffAccountController = require("../controllers/staff.accountsController");

router.get(
  "/all-accounts",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.getAllAccounts
);
router.get(
  "/all-pending-approvals",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.getAllPendingApprovals
);
router.get(
  "/all-account-names",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  staffAccountController.getAllAccountNames
);
router.get(
  "/all-account-names-id",
  staffAccountController.getAllAccountNamesAndId
);
router.get(
  "/all-accounts-summary",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.getAllAccountSummary
);
router.get(
  "/all-accounts-summary-withFilters",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.getAllAccountSummaryWithFilters
);
router.get(
  "/my-account/:staffId",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts),
  staffAccountController.getAccountById
);
router.get(
  "/my-account-withFilters/:staffId",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts),
  staffAccountController.getAccountDetailsById
);
router.get(
  "/my-account-summary/:staffId",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts),
  staffAccountController.getAccountSummary
);
router.post(
  "/process-payment-request",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.processPaymentRequest
);
router.post(
  "/decline-payment-request",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.declinePaymentRequest
);
router.put(
  "/edit-pending-payment",
  upload.single("paymentProof"),
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.editPendingPayment
);
router.post(
  "/add-account",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.addStaffAccount
);
router.post(
  "/transfer-amount",
  upload.single("paymentProof"),
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts),
  staffAccountController.transferAmount
);
router.post(
  "/debit-amount",
  upload.single("paymentProof"),
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts),
  staffAccountController.debitAmount
);

router.put(
  "/reset",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.resetAmounts
);
router.put(
  "/resetApprovals",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  staffAccountController.removeAllPendingRequests
);

module.exports = router;

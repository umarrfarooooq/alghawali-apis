const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const hiringController = require("../controllers/hiringController");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const upload = require("../middlewears/uploadMiddlewear");
const roles = require("../config/roles");
const checkPermission = require("../middlewears/checkPermission");

router.get(
  "/pending",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  transactionController.getAllPendingTransactions
);
router.get(
  "/recent",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  transactionController.getAllRecentTransactions
);
router.get(
  "/my/pending",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  transactionController.getMyAllPendingTransactions
);
router.get(
  "/my/recent",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  transactionController.getMyAllRecentTransactions
);
router.get(
  "/:id",
  verifyStaffToken,
  checkPermission(roles.canAccessOnAccounts),
  transactionController.getTransactionById
);
router.post(
  "/handlePendingTransaction",
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  hiringController.handlePendingTransaction
);
router.put(
  "/editTransaction",
  upload.single("proof"),
  verifyStaffToken,
  checkPermission(roles.fullAccessOnAccounts),
  hiringController.editTransaction
);

module.exports = router;
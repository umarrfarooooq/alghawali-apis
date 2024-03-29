const express = require('express');
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear")
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission")
const roles = require("../config/roles")
const staffAccountController = require("../controllers/staff.accountsController")

router.get("/all-accounts", verifyStaffToken, checkPermission(roles.fullAccessOnAccounts), staffAccountController.getAllAccounts)
router.get("/all-accounts-summary", verifyStaffToken, checkPermission(roles.fullAccessOnAccounts), staffAccountController.getAllAccountSummary)
router.get("/my-account/:staffId", verifyStaffToken, checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts), staffAccountController.getAccountById)
router.get("/my-account-summary/:staffId", verifyStaffToken, checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts), staffAccountController.getAccountSummary)

router.post("/add-account", verifyStaffToken, checkPermission(roles.fullAccessOnAccounts), staffAccountController.addStaffAccount)
router.post("/transfer-amount", upload.single("paymentProof") , verifyStaffToken, checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts), staffAccountController.transferAmount)
router.post("/debit-amount", upload.single("paymentProof") , verifyStaffToken, checkPermission(roles.canAccessOnAccounts || roles.fullAccessOnAccounts), staffAccountController.debitAmount)


module.exports = router;

const express = require('express');
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear")
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission")
const roles = require("../config/roles")
const costumersAccountController = require("../controllers/cos.accountsController")

router.post('/hiring/:id', upload.single('hiringSlip') , costumersAccountController.createHiring)
router.get('/all', costumersAccountController.getAllAccounts)


module.exports = router;

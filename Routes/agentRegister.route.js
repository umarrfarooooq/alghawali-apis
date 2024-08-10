const express = require('express');
const router = express.Router();

const agentRegisterController = require("../controllers/agentRegisterController");
const upload = require('../middlewears/uploadMiddlewear');
const verifyStaffToken = require('../middlewears/verifyStaffToken');
const checkPermission = require('../middlewears/checkPermission');
const roles = require('../config/roles');

router.post("/register", upload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 }
]), agentRegisterController.registerAgent);

router.put("/approve/:registrationId", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentRegisterController.approveAgent);

router.put("/decline/:registrationId", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentRegisterController.declineAgent);

router.get("/registrations", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentRegisterController.getAllRegistrations);

router.get("/registration/:id", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentRegisterController.getRegistrationById);

module.exports = router;
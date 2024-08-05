const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const roles = require("../config/roles")
const checkPermission = require("../middlewears/checkPermission")

router.post("/invite-agent", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentController.inviteAgent)
router.get("/all-agents", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentController.getAllAgents)
router.post("/complete-signup/:token", agentController.completeSignup)
router.post("/toggle-block/:id", verifyStaffToken, checkPermission(roles.ShowAgentRequest), agentController.toggleAgentBlock)
router.post("/login", agentController.login)
router.post("/google-login", agentController.googleLogin)

module.exports = router;
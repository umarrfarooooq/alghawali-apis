const express = require('express');
const router = express.Router();

const maidRequestController = require("../controllers/agentMaidRequestController");
const upload = require('../middlewears/uploadMiddlewear');
const verifyAgentToken = require('../middlewears/checkAgentToken');

router.post("/create-maid-request", verifyAgentToken, upload.fields([
    { name: 'maidImage', maxCount: 1 },
    { name: 'videoLink', maxCount: 1 },
    { name: 'maidPassportFront', maxCount: 1 },
    { name: 'maidPassportBack', maxCount: 1 }
]), maidRequestController.createMaidRequest)

router.get("/all-requests", maidRequestController.getAllMaidRequests)
router.get("/request", maidRequestController.getMaidRequestById)
router.get("/update-request-status", maidRequestController.updateMaidRequestStatus)

module.exports = router;
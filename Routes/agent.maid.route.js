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
router.get("/agent-maids/:agentId", maidRequestController.getAgentMaids)
router.get("/request/:id", maidRequestController.getMaidRequestById)
router.put("/update-maid/:agentId/:maidRequestId", upload.fields([
    { name: 'maidImage', maxCount: 1 },
    { name: 'videoLink', maxCount: 1 },
    { name: 'maidPassportFront', maxCount: 1 },
    { name: 'maidPassportBack', maxCount: 1 }
]), maidRequestController.updateMaidRequest)
router.put("/update-request-status/:id", maidRequestController.updateMaidRequestStatus)
router.delete("/:agentId/:maidRequestId", maidRequestController.deleteAgentMaidRequest)


module.exports = router;
const express = require("express");
const router = express.Router();
const maidRequestController = require("../controllers/agentMaidRequestController");
const upload = require("../middlewears/uploadMiddlewear");
const verifyAgentToken = require("../middlewears/checkAgentToken");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const verifyAgentOrStaffToken = require("../middlewears/verifyAgentOrStaffToken");

router.post(
  "/create-maid-request",
  verifyAgentToken,
  upload.fields([
    { name: "maidImage", maxCount: 1 },
    { name: "videoLink", maxCount: 1 },
    { name: "maidPassportFront", maxCount: 1 },
    { name: "maidPassportBack", maxCount: 1 },
  ]),
  maidRequestController.createMaidRequest
);

router.get(
  "/all-requests",
  verifyStaffToken,
  checkPermission(roles.ShowAgentRequest),
  maidRequestController.getAllMaidRequests
);

router.get(
  "/agent-maids/:agentId",
  verifyAgentToken,
  maidRequestController.getAgentMaids
);

router.get(
  "/request/:id",
  verifyAgentOrStaffToken,
  maidRequestController.getMaidRequestById
);

router.put(
  "/update-maid/:agentId/:maidRequestId",
  verifyAgentToken,
  upload.fields([
    { name: "maidImage", maxCount: 1 },
    { name: "videoLink", maxCount: 1 },
    { name: "maidPassportFront", maxCount: 1 },
    { name: "maidPassportBack", maxCount: 1 },
  ]),
  maidRequestController.updateMaidRequest
);

router.put(
  "/update-request-status/:id",
  verifyStaffToken,
  checkPermission(roles.ShowAgentRequest),
  maidRequestController.updateMaidRequestStatus
);

router.delete(
  "/:agentId/:maidRequestId",
  verifyAgentToken,
  maidRequestController.deleteAgentMaidRequest
);

module.exports = router;

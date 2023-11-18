const express = require('express');
const router = express.Router();
const maidController = require("../controllers/maidController")
const upload = require("../middlewears/uploadMiddlewear")
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission")
const roles = require("../config/roles")

// CRUD
router.get('/', maidController.getAllMaids);
router.post('/', verifyStaffToken, checkPermission(roles.CanAddMaid), upload.fields([
    { name: 'maidImg', maxCount: 1 },
    { name: 'maidImg2', maxCount: 1 },
    { name: 'maidImg3', maxCount: 1 },
    { name: 'maidImg4', maxCount: 1 },
    { name: 'videoLink', maxCount: 1 }
  ]), maidController.addMaid);

router.put('/:id', verifyStaffToken,  checkPermission(roles.ShowOurMaid), upload.single("maidImg"), maidController.updateMaid);
router.put('/availablity/:id', verifyStaffToken,  checkPermission(roles.ShowOurMaid), maidController.updateMaidAvailablity);
router.post('/delete/:id', verifyStaffToken, checkPermission(roles.ShowOurMaid), maidController.deleteMaid);
router.get('/:id', verifyStaffToken,  checkPermission(roles.ShowOurMaid), maidController.getMaid);

module.exports = router;

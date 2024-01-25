const express = require('express');
const router = express.Router();
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const upload = require("../middlewears/uploadMiddlewear")
const roles = require("../config/roles")
const checkPermission = require("../middlewears/checkPermission")
const visaController = require('../controllers/visaController')

router.get("/", verifyStaffToken, checkPermission(roles.canAccessOnVisa), visaController.getAllVisas)
router.post("/", verifyStaffToken, checkPermission(roles.canAccessOnVisa), upload.fields([
    { name: 'maidImage', maxCount: 1 },
    { name: 'visaFile', maxCount: 1 },
  ]), visaController.addVisaDetails)
router.put('/info/:id', verifyStaffToken, checkPermission(roles.canAccessOnVisa), upload.single('maidImage'), visaController.updateMaidProfile);
router.put('/hiring-status/:id', verifyStaffToken, checkPermission(roles.canAccessOnVisa), visaController.updateHiringStatus);
router.put('/extend-visa/:id', verifyStaffToken, checkPermission(roles.canAccessOnVisa), upload.single("visaFile"), visaController.extendVisaById);
router.delete('/:id', verifyStaffToken, checkPermission(roles.canAccessOnVisa), visaController.deleteVisaById)

module.exports = router;

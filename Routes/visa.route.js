const express = require('express');
const router = express.Router();
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const upload = require("../middlewears/uploadMiddlewear")
const roles = require("../config/roles")
const checkPermission = require("../middlewears/checkPermission")
const visaController = require('../controllers/visaController')

router.get("/", visaController.getAllVisas)
router.post("/", upload.fields([
    { name: 'maidImage', maxCount: 1 },
    { name: 'visaFile', maxCount: 1 },
  ]), visaController.addVisaDetails)
router.put('/info/:id', upload.single('maidImage'), visaController.updateMaidProfile);
router.put('/hiring-status/:id', visaController.updateHiringStatus);
router.put('/extend-visa/:id', upload.single("visaFile"), visaController.extendVisaById);
router.delete('/:id', visaController.deleteVisaById)

module.exports = router;

const express = require("express");
const router = express.Router();
const upload = require("../middlewears/uploadMiddlewear");
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission");
const roles = require("../config/roles");
const {
  getAllMedicals,
  getMedicalByPassport,
  updateMedicalStatus,
  getMedicalsByStatus,
  deleteMedical,
  getMedicalStats,
  createMedicalManually,
} = require("../controllers/medicalController");

router.use(verifyStaffToken);
router.use(checkPermission(roles.canAccessOnVisa));

router.get("/", getAllMedicals);
router.post("/add-medical-manually", createMedicalManually);
router.get("/stats", getMedicalStats);
router.get("/status/:status", getMedicalsByStatus);
router.get("/:passportNo", getMedicalByPassport);
router.put(
  "/:passportNo",
  upload.fields([
    { name: "medicalFile", maxCount: 1 },
    { name: "mohFile", maxCount: 1 },
  ]),
  updateMedicalStatus
);
router.delete("/:passportNo", deleteMedical);

module.exports = router;

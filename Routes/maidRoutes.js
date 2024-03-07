const express = require('express');
const router = express.Router();
const maidController = require("../controllers/maidController")
const upload = require("../middlewears/uploadMiddlewear")
const verifyStaffToken = require("../middlewears/verifyStaffToken");
const checkPermission = require("../middlewears/checkPermission")
const roles = require("../config/roles")

// CRUD
router.get('/', maidController.getAllMaids);
router.get('/maidsInfo', verifyStaffToken, maidController.getMaidsInfo)
router.get('/withHired', verifyStaffToken, checkPermission(roles.ShowOurMaid) || checkPermission(roles.CanEditMaid), maidController.getAllMaidsWithHired);
router.get('/byStaff/hired/:staffId' , verifyStaffToken, maidController.getAllHiredMaidsByStaffId)
router.get('/byStaff/non-hired/:staffId' , verifyStaffToken, maidController.getAllNonHiredMaidsByStaffId)
router.post('/', verifyStaffToken, checkPermission(roles.CanAddMaid), 
upload.fields([
  { name: 'maidImg', maxCount: 1 },
  { name: 'maidImg2', maxCount: 1 },
  { name: 'maidImg3', maxCount: 1 },
  { name: 'maidImg4', maxCount: 1 },
  { name: 'videoLink', maxCount: 1 },
]), maidController.addMaid);
router.put('/:id', verifyStaffToken, checkPermission(roles.CanEditMaid),
upload.fields([
  { name: 'maidImg', maxCount: 1 },
  { name: 'maidImg2', maxCount: 1 },
  { name: 'maidImg3', maxCount: 1 },
  { name: 'maidImg4', maxCount: 1 },
  { name: 'videoLink', maxCount: 1 },
]),
maidController.updateMaid);
router.put('/availablity/:id', verifyStaffToken,  checkPermission(roles.ShowOurMaid), maidController.updateMaidAvailablity);
router.delete('/delete/:id', verifyStaffToken, checkPermission(roles.ShowOurMaid), maidController.deleteMaid);
router.get('/:id', maidController.getMaid);

// maid hiring routes

router.post('/hiring/:id', verifyStaffToken, checkPermission(roles.canAccessOnAccounts), upload.single('hiringSlip') , maidController.createHiring)
router.get('/hirings/all', verifyStaffToken,  maidController.getAllHiring)
router.get('/hiring/:id', verifyStaffToken, checkPermission(roles.canAccessOnAccounts),  maidController.getHiringById)
router.post('/unHiring/:id', verifyStaffToken, checkPermission(roles.canAccessOnAccounts),  maidController.createListAgain)
router.put('/hiring/update/:id', verifyStaffToken, checkPermission(roles.canAccessOnAccounts),  upload.single('hiringSlip') ,  maidController.updateHiringById)
router.put('/hiring/edit/:id', verifyStaffToken, checkPermission(roles.canAccessOnAccounts), upload.single('hiringSlip'), maidController.editHiringById)
router.get('/maid-history/:id', verifyStaffToken, checkPermission(roles.canAccessOnAccounts),  maidController.getMaidHistory)

module.exports = router;

// {
//   "amountGivenByCustomer": 200,
//   "paymentMethod":"Bank Transfer",
//   "receivedBy":"Leena"
// }
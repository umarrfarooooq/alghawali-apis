const express = require('express');
const router = express.Router();
const customRequirementsController = require('../controllers/customRequirementController');
const verifyStaffToken = require('../middlewears/verifyStaffToken'); 

// Routes

router.post('/', customRequirementsController.addCustomRequest);
router.get('/', verifyStaffToken, customRequirementsController.getAllRequirements);
router.delete('/:id', verifyStaffToken, customRequirementsController.deleteCustomRequest);
router.put('/:id', verifyStaffToken, customRequirementsController.editCustomRequest);
router.put('/mark-done/:id', verifyStaffToken, customRequirementsController.markRequestAsDone);

module.exports = router;

const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

router.post('/', staffController.createStaff);
router.get('/', staffController.getAllStaff);
router.post('/login', staffController.loginStaff)
router.get('/:id', staffController.getStaffById);
router.put('/:id', staffController.updateStaffById);
router.delete('/:id', staffController.deleteStaffById);

module.exports = router;

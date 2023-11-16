const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController")
const verifyAdminToken = require("../middlewears/verifyAdminToken")

// CRUD
router.get('/', verifyAdminToken, userController.getAllUsers);
router.post('/', userController.addUser);
router.post('/login', userController.loginUser);
router.delete('/:id',verifyAdminToken, userController.deleteUser);
router.get('/:id', userController.getUser);

module.exports = router;
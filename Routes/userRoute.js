const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController")

// CRUD
router.get('/', userController.getAllUsers);
router.post('/', userController.addUser);
router.post('/login', userController.loginUser);
router.delete('/:id', userController.deleteUser);
router.get('/:id', userController.getUser);

module.exports = router;
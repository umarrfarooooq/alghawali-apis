require('dotenv').config();
const User = require("../Models/User");
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
exports.addUser = async (req, res) =>{
    try {
        const { firstName, lastName, phNumber, email, password } = req.body;
    
        const existingUser = await User.findOne({ phNumber });
        if (existingUser) {
          return res.status(400).json({ error: 'Phone already registered' });
        }
    
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
    
        const newUser = new User({
          firstName,
          lastName,
          email,
          phNumber,
          password: hashedPassword,
        });
    
        const savedUser = await newUser.save();
    
        res.status(201).json(savedUser);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
    
}

exports.deleteUser = async (req, res) =>{
    try {
        const userId = req.params.id;
    
        const deletedUser = await User.findByIdAndDelete(userId);
    
        if (!deletedUser) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
}
exports.getAllUsers = async(req, res) =>{
    try {
        const allUsers = await User.find();
        res.status(200).json(allUsers);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
}
exports.getUser = async (req, res) =>{
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
    
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
}
exports.loginUser = async (req, res) => {
  try {
    const { phNumber, password } = req.body;

    const user = await User.findOne({ phNumber });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect Password' });
    }


    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '3d' });

    res.status(200).json({ message: 'User logged in successfully', token });

  } catch (error) {
    res.status(500).json({ error: 'An error occurred' + error });
  }
};


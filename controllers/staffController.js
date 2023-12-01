const fs = require("fs/promises")
const path = require("path")
const jwt = require('jsonwebtoken');
const Staff = require('../Models/Staff');
const bcrypt = require('bcryptjs');

exports.createStaff = async (req, res) => {
  try {
    const { fullName, email, password, roles } = req.body;

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ error: 'Email already exists' });
    }


    let staffImage;
    if (req.file) {
      staffImage = req.file.path;
    }

    const newStaff = new Staff({
      fullName,
      email,
      password,
      roles: roles || [],
      image:staffImage
    });

    const savedStaff = await newStaff.save();

    res.status(201).json(savedStaff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.getAllStaff = async (req, res) => {
  try {
    const allStaff = await Staff.find();
    res.status(200).json(allStaff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.updateStaffById = async (req, res) => {
  try {
    const staffId = req.params.id;
    const updatedStaffData = req.body;

    const existingStaff = await Staff.findByIdAndUpdate(staffId, updatedStaffData, { new: true });
    if (req.file) {
      const newStaffImage = req.file.path;
      if (existingStaff.image) {
        await fs.unlink(path.join(__dirname, '..', existingStaff.image));
      }
      existingStaff.image = newStaffImage;
    }

    if (!existingStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.status(200).json(existingStaff);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.deleteStaffById = async (req, res) => {
  try {
    const staffId = req.params.id;

    const deletedMember = await Staff.findByIdAndDelete(staffId);
    if (!deletedMember) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

exports.loginStaff = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      const staff = await Staff.findOne({ email });
      if (!staff) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      const passwordMatch = await password === staff.password;
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const staffRoles = staff.roles;
      const tokenPayload = {
        staffId: staff._id,
        staffRoles: staffRoles,
        staffName: staff.fullName
      };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
  
      res.setHeader('Authorization', `Bearer ${token}`);
      res.status(200).json({ message: 'Login successful', staffToken: token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  };
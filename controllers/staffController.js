const fs = require("fs/promises")
const path = require("path")
const jwt = require('jsonwebtoken');
const Staff = require('../Models/Staff');
const bcrypt = require('bcryptjs');
const passport = require("../config/passport");
const crypto = require('crypto');

exports.createStaffGoogle = (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
};

exports.createStaffGoogleCallback = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (!user) {
      return res.redirect('http://localhost:5173/login');
    }

    const { _id, roles, fullName } = user;
    const tokenPayload = {
      staffId: _id,
      staffRoles: roles,
      staffName: fullName
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
    return res.redirect(`http://localhost:5173/?token=${token}`);
  })(req, res, next);
};

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
      image:staffImage,
      adminKnows: true,
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
      const { loginIdentifier, password } = req.body;

      const isEmail = /^\S+@\S+\.\S+$/.test(loginIdentifier);
      const queryField = isEmail ? 'email' : 'phoneNumber';

      const staff = await Staff.findOne({ [queryField]: loginIdentifier });
      if (!staff) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if(!staff.adminKnows){
        return res.status(401).json({ error: 'You are not approved from admin' });
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

  exports.sendStaffInvitation = async (req, res) => {
    try {
      const { fullName, roles } = req.body;
  
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationTokenExpiry = new Date();
      invitationTokenExpiry.setDate(invitationTokenExpiry.getDate() + 3);
  
      const newStaff = new Staff({
        fullName,
        roles: roles || [],
        adminKnows: true,
        invitationToken,
        invitationTokenExpiry,
      });
  
      const savedStaff = await newStaff.save();
  
      const inviteLink = `http://localhost:5173/signup/${savedStaff.invitationToken}`;
  
      res.status(200).json({ inviteLink });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  };

  exports.signupMember = async (req, res) => {
    try {
      const { phoneNumber, password, invitationToken } = req.body;
  
      const staff = await Staff.findOne({
        invitationToken,
        invitationTokenExpiry: { $gt: new Date() },
      });
  
      if (!staff) {
        return res.status(400).json({ error: 'Invalid invitation token or link has expired' });
      }
  
      staff.phoneNumber = phoneNumber;
      staff.password = password;
      staff.invitationToken = undefined;
      staff.invitationTokenExpiry = undefined;
  
      const savedMember = await staff.save();
  
      res.status(201).json(savedMember);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
    }
  };
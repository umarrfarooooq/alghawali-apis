const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const bcrypt = require('bcryptjs');

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect Password' });
    }

    if (!user.admin) {
      return res.status(403).json({ error: 'Access denied. User is not an admin.' });
    }

    const adminToken = jwt.sign({ userId: user._id, admin: true }, process.env.JWT_SECRET_KEY, { expiresIn: '3d' });

    res.status(200).json({ message: 'Admin logged in successfully', token: adminToken });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
};

const User = require("../Models/User");
const jwt = require('jsonwebtoken');

exports.verifyToken = async (req, res, next) => {
    const authToken = req.headers.authorization;
  
    if (!authToken) {
      return res.status(401).json({ error: 'Access denied. Token missing.' });
    }
  
    try {
      const token = authToken.replace('Bearer ', ''); // Remove "Bearer " prefix
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
  
      const user = await User.findById(decodedToken.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.cookie('authToken', token, { httpOnly: true });

      req.user = user;
      next(); 
    } catch (error) {
      res.status(401).json({ error: 'Access denied. Invalid token.' });
    }
};

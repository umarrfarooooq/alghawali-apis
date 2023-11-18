const jwt = require('jsonwebtoken');

const verifyStaffToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token is missing.' });
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET_KEY);
    req.staffId = decoded.staffId;
    req.staffRoles = decoded.staffRoles;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = verifyStaffToken;

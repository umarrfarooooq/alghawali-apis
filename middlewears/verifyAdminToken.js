const jwt = require('jsonwebtoken');

const verifyAdminToken = (req, res, next) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!decoded.admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.userId = decoded.userId;
    next();
  });
};

module.exports = verifyAdminToken;

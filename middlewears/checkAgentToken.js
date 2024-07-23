const jwt = require('jsonwebtoken');

const verifyAgentToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token is missing.' });
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET_KEY);
    req.agentId = decoded.id;
    req.agentRoles = decoded.roles;
    req.agentName = decoded.name;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = verifyAgentToken;

const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
      const staffRoles = req.staffRoles || [0];
      
      if (!staffRoles.includes(requiredPermission)) {
        return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
      }
  
      next();
    };
  };
  
module.exports = checkPermission;

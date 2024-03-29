const checkPermission = (requiredPermissions) => {
  return (req, res, next) => {
    const staffRoles = req.staffRoles || [];
    const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]; // Ensure requiredPermissions is an array

    
    const hasPermission = permissionsArray.some(permission => staffRoles.includes(permission));

    if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
    }

    next();
};
  };
  
module.exports = checkPermission;

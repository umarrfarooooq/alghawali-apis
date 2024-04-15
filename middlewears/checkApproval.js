const roles = require("../config/roles")

const checkApproval = (req, res, next) => {
    const staffRoles = req.staffRoles || [];
    const requiresApprovalRoles = [roles.canAccessOnAccounts];

    const requiresApproval = requiresApprovalRoles.some(role => staffRoles.includes(role));

    if (requiresApproval) {
        return res.status(403).json({ error: 'Approval required for this transaction' });
    }

    next();
};

module.exports = checkApproval;

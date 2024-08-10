const verifyAgentToken = require("./checkAgentToken");
const verifyStaffToken = require("./verifyStaffToken");

const verifyAgentOrStaffToken = (req, res, next) => {
  verifyAgentToken(req, res, (err) => {
    if (!err) {
      return next();
    }
    verifyStaffToken(req, res, next);
  });
};
module.exports = verifyAgentOrStaffToken;

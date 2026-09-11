const ApiError = require('../utils/ApiError');

/**
 * Usage: router.post('/', verifyToken, requireRole('ADMIN', 'COMMITTEE_MEMBER'), controller)
 * Must run after verifyToken so req.user is populated.
 */
function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = { requireRole };

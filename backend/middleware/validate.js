const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Place after an array of express-validator checks in a route definition.
// Collects all validation errors and returns them together as a 400.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(ApiError.badRequest('Validation failed', errors.array()));
  }
  return next();
}

module.exports = validate;

const ApiError = require('../utils/ApiError');
const { nodeEnv } = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || undefined,
    });
  }

  // Mongoose duplicate key error (e.g. unique receiptNumber/phone collision)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({
    success: false,
    message: nodeEnv === 'development' ? err.message : 'Internal server error',
  });
}

module.exports = errorHandler;

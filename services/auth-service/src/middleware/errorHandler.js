'use strict';

const logger = require('../config/logger');

const errorHandler = (err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;

  logger.error(err.message, { stack: err.stack, status });

  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: err.errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({ success: false, message: `Duplicate value for field: ${field}` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token has expired' });
  }

  return res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : err.message,
  });
};

module.exports = errorHandler;

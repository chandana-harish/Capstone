'use strict';

const logger = require('../config/logger');

const errorHandler = (err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  logger.error(err.message, { stack: err.stack });

  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Attendance record already exists for this user, training, and date' });
  }
  if (err.name === 'ValidationError') {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: err.errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  return res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : err.message,
  });
};

module.exports = errorHandler;

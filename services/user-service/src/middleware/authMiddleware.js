'use strict';

const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../config/logger');

/**
 * Middleware: verifies JWT by calling auth-service /api/auth/verify
 * Falls back to local decode if AUTH_SERVICE_URL not set (dev convenience).
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const authServiceUrl = process.env.AUTH_SERVICE_URL;

    if (authServiceUrl) {
      // Service-to-service verification
      try {
        const response = await axios.get(`${authServiceUrl}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000,
        });
        req.user = response.data.data;
      } catch (err) {
        logger.warn('Auth service verification failed:', err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
    } else {
      // Local decode fallback
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    }

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized for this action`,
    });
  }
  return next();
};

module.exports = { authenticate, authorize };

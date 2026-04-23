'use strict';

const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token required' });
    }
    const token = authHeader.split(' ')[1];
    const authServiceUrl = process.env.AUTH_SERVICE_URL;

    if (authServiceUrl) {
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    }
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' is not authorized` });
  }
  return next();
};

module.exports = { authenticate, authorize };

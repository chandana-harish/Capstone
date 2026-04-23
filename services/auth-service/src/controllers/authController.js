'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const AuthUser = require('../models/AuthUser');
const logger = require('../config/logger');

// ── Helpers ────────────────────────────────────────────────────────────────────
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    issuer: 'tms-auth-service',
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'tms-auth-service',
  });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── Register ───────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { userId, email, password, role } = req.body;

    const existing = await AuthUser.findOne({ $or: [{ email }, { userId }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email or ID already exists' });
    }

    const user = await AuthUser.create({
      userId,
      email,
      passwordHash: password, // pre-save hook will hash it
      role: role || 'trainee',
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { userId: user.userId, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// ── Login ──────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await AuthUser.findOne({ email }).select('+passwordHash +refreshTokenHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const tokenPayload = { userId: user.userId, email: user.email, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Persist hashed refresh token
    user.refreshTokenHash = hashToken(refreshToken);
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        user: { userId: user.userId, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Refresh Token ──────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await AuthUser.findOne({ userId: decoded.userId }).select('+refreshTokenHash');
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or invalid' });
    }

    const tokenPayload = { userId: user.userId, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── Logout ─────────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (userId) {
      await AuthUser.findOneAndUpdate({ userId }, { refreshTokenHash: null }, { new: false });
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Verify Token (internal service-to-service endpoint) ────────────────────────
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.status(200).json({
      success: true,
      data: { userId: decoded.userId, email: decoded.email, role: decoded.role },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Change Password ────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { userId, currentPassword, newPassword } = req.body;

    const user = await AuthUser.findOne({ userId }).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);
    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refreshToken, logout, verifyToken, changePassword };

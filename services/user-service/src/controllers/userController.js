'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../config/logger');

// ── Create User (called by auth-service after registration, or by admin) ──────
const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { userId, email, firstName, lastName, role, department, designation, phone, managerId } = req.body;

    const user = await User.create({ userId, email, firstName, lastName, role, department, designation, phone, managerId });
    logger.info(`User profile created: ${user.userId}`);

    return res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    next(error);
  }
};

// ── Get all users ──────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, department, isActive, search } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get user by userId ─────────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ── Update user ────────────────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const allowedFields = ['firstName', 'lastName', 'department', 'designation', 'phone', 'managerId'];
    // Only admin can change role / isActive
    if (req.user.role === 'admin') allowedFields.push('role', 'isActive');

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findOneAndUpdate({ userId: req.params.userId }, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.info(`User updated: ${user.userId}`);
    return res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

// ── Soft delete user ───────────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { isActive: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.info(`User deactivated: ${user.userId}`);
    return res.status(200).json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Get my profile ─────────────────────────────────────────────────────────────
const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ success: false, message: 'Profile not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ── Internal: validate user exists (called by other services) ─────────────────
const validateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: req.params.userId, isActive: true });
    if (!user) return res.status(404).json({ success: false, message: 'Active user not found' });
    return res.status(200).json({
      success: true,
      data: { userId: user.userId, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser, getMyProfile, validateUser };

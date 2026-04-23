'use strict';

const { body } = require('express-validator');

const registerValidators = [
  body('userId').trim().notEmpty().withMessage('userId is required').isAlphanumeric().withMessage('userId must be alphanumeric'),
  body('email').trim().isEmail().withMessage('Must be a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('role').optional().isIn(['admin', 'trainer', 'trainee']).withMessage('Role must be admin, trainer, or trainee'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Must be a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidators = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
];

module.exports = { registerValidators, loginValidators, changePasswordValidators };

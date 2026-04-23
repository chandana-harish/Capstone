'use strict';

const { body } = require('express-validator');

const createUserValidators = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'trainer', 'trainee']).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const updateUserValidators = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('role').optional().isIn(['admin', 'trainer', 'trainee']).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

module.exports = { createUserValidators, updateUserValidators };

'use strict';

const { body } = require('express-validator');

const createTrainingValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('category').optional().isIn(['technical', 'soft-skills', 'compliance', 'leadership', 'onboarding', 'other']).withMessage('Invalid category'),
  body('mode').optional().isIn(['online', 'offline', 'hybrid']).withMessage('Invalid mode'),
  body('startDate').isISO8601().withMessage('startDate must be a valid ISO date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid ISO date'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer (hours)'),
  body('maxCapacity').isInt({ min: 1 }).withMessage('maxCapacity must be a positive integer'),
];

const updateTrainingValidators = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('category').optional().isIn(['technical', 'soft-skills', 'compliance', 'leadership', 'onboarding', 'other']).withMessage('Invalid category'),
  body('mode').optional().isIn(['online', 'offline', 'hybrid']).withMessage('Invalid mode'),
  body('status').optional().isIn(['draft', 'published', 'ongoing', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('maxCapacity').optional().isInt({ min: 1 }).withMessage('maxCapacity must be a positive integer'),
];

module.exports = { createTrainingValidators, updateTrainingValidators };

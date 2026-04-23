'use strict';

const { body } = require('express-validator');

const markAttendanceValidators = [
  body('trainingId').trim().notEmpty().withMessage('trainingId is required'),
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('date').isISO8601().withMessage('date must be a valid ISO date'),
  body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
];

const bulkMarkAttendanceValidators = [
  body('trainingId').trim().notEmpty().withMessage('trainingId is required'),
  body('date').isISO8601().withMessage('date must be a valid ISO date'),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.userId').trim().notEmpty().withMessage('Each record must have a userId'),
  body('records.*.status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status in records'),
];

const updateAttendanceValidators = [
  body('status').optional().isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
];

module.exports = { markAttendanceValidators, bulkMarkAttendanceValidators, updateAttendanceValidators };

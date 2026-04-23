'use strict';

const { Router } = require('express');
const {
  markAttendance, bulkMarkAttendance, getAttendanceByTraining,
  getAttendanceByUser, updateAttendance, getAttendanceSummary,
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  markAttendanceValidators, bulkMarkAttendanceValidators, updateAttendanceValidators,
} = require('../validators/attendanceValidators');

const router = Router();

router.use(authenticate);

// Mark attendance — trainers and admins only
router.post('/', authorize('admin', 'trainer'), markAttendanceValidators, markAttendance);
router.post('/bulk', authorize('admin', 'trainer'), bulkMarkAttendanceValidators, bulkMarkAttendance);

// Query attendance
router.get('/training/:trainingId', authorize('admin', 'trainer'), getAttendanceByTraining);
router.get('/training/:trainingId/summary', authorize('admin', 'trainer'), getAttendanceSummary);
router.get('/user/:userId', getAttendanceByUser);

// Update record
router.put('/:attendanceId', authorize('admin', 'trainer'), updateAttendanceValidators, updateAttendance);

module.exports = router;

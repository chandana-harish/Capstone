'use strict';

const { Router } = require('express');
const {
  createTraining, getAllTrainings, getTrainingById,
  updateTraining, deleteTraining, enrollUser, unenrollUser, validateTraining,
} = require('../controllers/trainingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { createTrainingValidators, updateTrainingValidators } = require('../validators/trainingValidators');

const router = Router();

// Internal service-to-service (no JWT — internal network only)
router.get('/internal/validate/:trainingId', validateTraining);

// All routes below require authentication
router.use(authenticate);

router.get('/', getAllTrainings);
router.get('/:trainingId', getTrainingById);

// Trainer / Admin can create and manage
router.post('/', authorize('admin', 'trainer'), createTrainingValidators, createTraining);
router.put('/:trainingId', authorize('admin', 'trainer'), updateTrainingValidators, updateTraining);
router.delete('/:trainingId', authorize('admin', 'trainer'), deleteTraining);

// Enrollment
router.post('/:trainingId/enroll', enrollUser);
router.post('/:trainingId/unenroll', unenrollUser);

module.exports = router;

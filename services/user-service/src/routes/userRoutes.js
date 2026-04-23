'use strict';

const { Router } = require('express');
const {
  createUser, getAllUsers, getUserById,
  updateUser, deleteUser, getMyProfile, validateUser,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { createUserValidators, updateUserValidators } = require('../validators/userValidators');

const router = Router();

// ── Internal (service-to-service, no JWT needed — use internal network only) ──
router.get('/internal/validate/:userId', validateUser);

// ── All routes below require authentication ───────────────────────────────────
router.use(authenticate);

router.get('/me', getMyProfile);

// Admin-only: create user, list all, delete
router.post('/', authorize('admin'), createUserValidators, createUser);
router.get('/', authorize('admin', 'trainer'), getAllUsers);
router.get('/:userId', authorize('admin', 'trainer'), getUserById);
router.put('/:userId', updateUserValidators, updateUser);
router.delete('/:userId', authorize('admin'), deleteUser);

module.exports = router;

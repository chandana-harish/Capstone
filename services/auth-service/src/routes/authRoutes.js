'use strict';

const { Router } = require('express');
const {
  register, login, refreshToken, logout, verifyToken, changePassword,
} = require('../controllers/authController');
const {
  registerValidators, loginValidators, changePasswordValidators,
} = require('../validators/authValidators');

const router = Router();

// Public routes
router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Internal service-to-service token verification
router.get('/verify', verifyToken);

// Authenticated user operations
router.put('/change-password', changePasswordValidators, changePassword);

module.exports = router;

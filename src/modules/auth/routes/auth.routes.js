const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const authController = require('../controllers/auth.controller');

/**
 * POST /auth/login
 */
router.post('/login', authController.login);

/**
 * POST /auth/apply-doctor
 */
router.post(
  '/apply-doctor',
  authenticateToken,
  authController.applyDoctor
);

module.exports = router;

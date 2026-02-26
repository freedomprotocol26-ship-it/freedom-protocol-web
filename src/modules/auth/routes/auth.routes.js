const express = require('express');
const router = express.Router();

const { login, register, applyDoctor } = require('../controllers/auth.controller');
const { authenticateToken } = require('../../../middleware/auth');

/**
 * ======================================
 * POST /auth/login
 * ======================================
 */
router.post('/login', login);

/**
 * ======================================
 * POST /auth/register
 * ======================================
 */
router.post('/register', register);

/**
 * ======================================
 * POST /auth/apply-doctor
 * ======================================
 */
router.post('/apply-doctor', authenticateToken, applyDoctor);

module.exports = router;
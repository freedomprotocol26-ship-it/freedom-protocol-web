/**
 * Freedom Protocol - Authentication Routes
 * API endpoints for user authentication
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * POST /auth/login
 * Authenticate user and issue tokens
 * 
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 */
router.post('/login', authController.login);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * 
 * Body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/refresh', authController.refresh);

/**
 * POST /auth/logout
 * Revoke refresh token and logout user
 * 
 * Body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/logout', authController.logout);

module.exports = router;
/**
 * Freedom Protocol - Authentication Controller
 * HTTP handlers for authentication endpoints
 */

const authService = require('../services/auth.service');
const controllerErrorHandler = require('./controllerErrorHandler');

/**
 * Login user
 * POST /auth/login
 */
const login = controllerErrorHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
    timestamp: new Date().toISOString()
  });
});

/**
 * Refresh access token
 * POST /auth/refresh
 */
const refresh = controllerErrorHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: result,
    timestamp: new Date().toISOString()
  });
});

/**
 * Logout user
 * POST /auth/logout
 */
const logout = controllerErrorHandler(async (req, res) => {
  const { refreshToken } = req.body;

  await authService.logout(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  login,
  refresh,
  logout
};

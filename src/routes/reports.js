/**
 * Freedom Protocol - Report Routes
 */

const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const { authenticateJWT } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/role.middleware');

/**
 * Get my report (role-based)
 */
router.get(
  '/reports/me',
  authenticateJWT,
  authorizeRole(['patient', 'doctor', 'partner', 'admin']),
  reportController.getMyReport
);

module.exports = router;

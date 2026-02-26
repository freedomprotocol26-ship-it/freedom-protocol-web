/**
 * Freedom Protocol - Doctor Routes
 */

const express = require('express');
const router = express.Router();

const doctorController = require('../controllers/doctor.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/role.middleware');

/**
 * GET doctor dashboard
 */
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRole(['doctor']),
  doctorController.getDashboard
);

/**
 * GET doctor wallet
 */
router.get(
  '/wallet',
  authenticateToken,
  authorizeRole(['doctor']),
  doctorController.getWallet
);

/**
 * GET doctor consultations
 */
router.get(
  '/consultations',
  authenticateToken,
  authorizeRole(['doctor']),
  doctorController.getConsultations
);

module.exports = router;
const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireDoctor = require('../../../middleware/requireDoctor');

const doctorAlertsController = require('../controllers/doctorAlerts.controller');

/**
 * GET Doctor Alerts
 * Returns:
 * - Critical glucose patients
 * - Stagnation cases
 * - Pending transitions
 */
router.get(
  '/alerts',
  authenticateToken,
  requireDoctor,
  doctorAlertsController.getDoctorAlerts
);

module.exports = router;

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireDoctor = require('../../../middleware/requireDoctor');

const doctorDashboardController = require('../controllers/doctorDashboard.controller');
const doctorAlertsController = require('../controllers/doctorAlerts.controller');
const doctorPriorityController = require('../controllers/doctorPriority.controller');

/**
 * Dashboard statistics
 */
router.get(
  '/dashboard/stats',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.getDoctorStats
);

/**
 * Priority intelligence
 */
router.get(
  '/dashboard/priority',
  authenticateToken,
  requireDoctor,
  doctorPriorityController.getPriorityList
);

/**
 * All patients
 */
router.get(
  '/patients',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.getDoctorPatients
);

/**
 * Single patient
 */
router.get(
  '/patients/:patientId',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.getDoctorPatientById
);

/**
 * Search patients
 */
router.get(
  '/patients/search',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.searchDoctorPatients
);

/**
 * Alerts
 */
router.get(
  '/alerts',
  authenticateToken,
  requireDoctor,
  doctorAlertsController.getDoctorAlerts
);

module.exports = router;
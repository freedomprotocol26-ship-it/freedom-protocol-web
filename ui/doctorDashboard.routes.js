const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireDoctor = require('../../../middleware/requireDoctor');
const doctorDashboardController = require('../controllers/doctorDashboard.controller');

/**
 * Dashboard statistics
 */
router.get(
  '/doctor/dashboard/stats',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.getDoctorStats
);

/**
 * All patients
 */
router.get(
  '/doctor/patients',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.getDoctorPatients
);

/**
 * Single patient
 */
router.get(
  '/doctor/patients/:patientId',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.getDoctorPatientById
);

/**
 * Search patients
 */
router.get(
  '/doctor/patients/search',
  authenticateToken,
  requireDoctor,
  doctorDashboardController.searchDoctorPatients
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../middleware/auth');
const doctorDashboardController = require('../controllers/doctorDashboard.controller');

router.get(
  '/doctor/dashboard',
  authenticateToken,
  doctorDashboardController.getDashboard
);

router.get(
  '/doctor/patients',
  authenticateToken,
  doctorDashboardController.getPatients
);

module.exports = router;

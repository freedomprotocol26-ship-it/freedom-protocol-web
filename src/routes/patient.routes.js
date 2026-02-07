const express = require('express');
const router = express.Router();

const patientController = require('../controllers/patient.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * Doctor routes
 */
router.post(
  '/api/patients',
  authenticateToken,
  patientController.createPatient
);

router.get(
  '/api/patients',
  authenticateToken,
  patientController.listPatients
);

router.get(
  '/api/patients/:id',
  authenticateToken,
  patientController.getPatientById
);

router.put(
  '/api/patients/:id',
  authenticateToken,
  patientController.updatePatient
);

router.delete(
  '/api/patients/:id',
  authenticateToken,
  patientController.deletePatient
);

/**
 * Patient self routes
 */
router.get(
  '/api/patients/me',
  authenticateToken,
  patientController.getMe
);

router.put(
  '/api/patients/me',
  authenticateToken,
  patientController.updateMe
);

module.exports = router;

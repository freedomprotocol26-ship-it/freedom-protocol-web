/**
 * Freedom Protocol - Patient Routes
 */

const express = require('express');
const router = express.Router();

const patientController = require('../controllers/patient.controller');
const { authenticateJWT } = require('../middleware/auth');
const {
  authorizeRole,
  authorizeDoctorPatient,
  subscriptionGate
} = require('../middleware/role.middleware');

/**
 * GET patient (self, doctor, admin)
 */
router.get(
  '/patients/:patientId',
  authenticateJWT,
  authorizeRole(['patient', 'doctor', 'admin']),
  authorizeDoctorPatient(),
  patientController.getPatient
);

/**
 * GET doctor patients
 */
router.get(
  '/doctors/:doctorId/patients',
  authenticateJWT,
  authorizeRole(['doctor', 'admin']),
  patientController.getDoctorPatients
);

/**
 * Onboard patient
 */
router.post(
  '/patients',
  authenticateJWT,
  authorizeRole(['doctor']),
  patientController.onboardPatient
);

/**
 * Update patient
 */
router.put(
  '/patients/:patientId',
  authenticateJWT,
  authorizeRole(['patient', 'doctor', 'admin']),
  authorizeDoctorPatient(),
  patientController.updatePatient
);

/**
 * Patient uploads
 */
router.get(
  '/patients/:patientId/uploads',
  authenticateJWT,
  authorizeRole(['patient', 'doctor']),
  subscriptionGate(),
  authorizeDoctorPatient(),
  patientController.getPatientUploads
);

module.exports = router;

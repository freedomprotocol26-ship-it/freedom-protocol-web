const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireActiveSubscription = require('../../../middleware/requireActiveSubscription');
const requireDoctor = require('../../../middleware/requireDoctor');

const patientController = require('../controllers/patient.controller');
const patientProtocolController = require('../controllers/patientProtocol.controller');
const patientProtocolRuntimeController = require('../controllers/patientProtocolRuntime.controller');

/**
 * ======================================
 * PATIENT SELF ROUTES
 * ======================================
 */

/**
 * GET /patients/me
 */
router.get(
  '/me',
  authenticateToken,
  requireActiveSubscription,
  patientController.getMyProfile
);

/**
 * GET /patients/me/protocols
 * (List all protocol assignments for patient)
 */
router.get(
  '/me/protocols',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolController.getMyProtocols
);

/**
 * POST /patients/me/protocols/:id/start
 * (Start protocol runtime)
 */
router.post(
  '/me/protocols/:id/start',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolRuntimeController.startProtocol
);

/**
 * GET /patients/me/protocols/:id/current-phase
 * (Get current active phase + actions)
 */
router.get(
  '/me/protocols/:id/current-phase',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolRuntimeController.getCurrentPhase
);


/**
 * ======================================
 * DOCTOR ROUTES
 * ======================================
 */

/**
 * GET /patients/doctor/patients
 * (List doctor's patients)
 */
router.get(
  '/doctor/patients',
  authenticateToken,
  requireDoctor,
  patientController.getDoctorPatients
);

/**
 * POST /patients/:patientId/assign-protocol
 * (Doctor assigns protocol to patient)
 */
router.post(
  '/:patientId/assign-protocol',
  authenticateToken,
  requireDoctor,
  patientProtocolController.assignProtocol
);

/**
 * GET /patients/:patientId/protocols
 * (Doctor views patient's protocol assignments)
 */
router.get(
  '/:patientId/protocols',
  authenticateToken,
  requireDoctor,
  patientProtocolController.getPatientProtocols
);

module.exports = router;

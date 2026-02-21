const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const consultationController = require('../controllers/consultation.controller');

/**
 * Create Consultation
 */
router.post(
  '/',
  authenticateToken,
  consultationController.createConsultation
);

/**
 * Start Consultation
 */
router.post(
  '/:id/start',
  authenticateToken,
  consultationController.startConsultation
);

/**
 * Generate Encounter Draft
 */
router.post(
  '/:id/generate-draft',
  authenticateToken,
  consultationController.generateEncounterDraft
);

/**
 * Approve Encounter
 */
router.post(
  '/:id/approve',
  authenticateToken,
  consultationController.approveEncounter
);

module.exports = router;

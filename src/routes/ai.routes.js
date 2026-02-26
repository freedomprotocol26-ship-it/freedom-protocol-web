const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

/**
 * ======================================
 * GENERATE CONSULTATION SUMMARY
 * ======================================
 */
router.post(
  '/generate-summary',
  authenticateToken,
  aiController.generateSummary
);

/**
 * ======================================
 * APPROVE CONSULTATION SUMMARY
 * ======================================
 */
router.post(
  '/approve-summary',
  authenticateToken,
  aiController.approveSummary
);

/**
 * ======================================
 * GET APPROVED SUMMARY (PATIENT)
 * ======================================
 */
router.get(
  '/patient-summary/:consultationId',
  authenticateToken,
  aiController.getApprovedSummary
);

module.exports = router;
const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');

const phaseTransitionController = require('../controllers/phaseTransition.controller');

console.log('🔥 PATIENT ROUTES FILE LOADED');

/**
 * ======================================
 * LIST PENDING TRANSITIONS
 * ======================================
 */
router.get(
  '/transitions/pending',
  authenticateToken,
  phaseTransitionController.listPending
);

/**
 * ======================================
 * REQUEST PHASE TRANSITION
 * ======================================
 */
router.post(
  '/transitions/request',
  authenticateToken,
  phaseTransitionController.requestTransition
);

/**
 * ======================================
 * APPROVE TRANSITION
 * ======================================
 */
router.post(
  '/transitions/:id/approve',
  authenticateToken,
  phaseTransitionController.approve
);

/**
 * ======================================
 * REJECT TRANSITION
 * ======================================
 */
router.post(
  '/transitions/:id/reject',
  authenticateToken,
  phaseTransitionController.reject
);

module.exports = router;
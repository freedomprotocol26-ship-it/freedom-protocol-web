const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');

const {
  completeIntake,
  getProtocolStatus,
  submitDailyCheckin,
  getDailyCheckins
} = require('../controllers/patient.controller');

const phaseTransitionController = require('../controllers/phaseTransition.controller');

const { buildMetabolicState } = require('../patientState.service');

console.log('🔥 PATIENT ROUTES FILE LOADED');

/**
 * ======================================
 * GET PROTOCOL STATUS
 * ======================================
 */
router.get(
  '/protocol-status',
  authenticateToken,
  getProtocolStatus
);

/**
 * ======================================
 * ACTIVATE INTAKE
 * ======================================
 */
router.post(
  '/intake',
  authenticateToken,
  completeIntake
);

/**
 * ======================================
 * DAILY CHECK-IN (SUBMIT)
 * ======================================
 */
router.post(
  '/daily-checkin',
  authenticateToken,
  submitDailyCheckin
);

/**
 * ======================================
 * DAILY CHECK-IN HISTORY (LAST 7)
 * ======================================
 */
router.get(
  '/daily-checkins',
  authenticateToken,
  getDailyCheckins
);

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

/**
 * ======================================
 * TEST METABOLIC STATE ENGINE (TEMP)
 * ======================================
 */
router.get(
  '/debug/metabolic-state',
  authenticateToken,
  async (req, res) => {
    try {
      const patientId = req.user.id;
      const state = await buildMetabolicState(patientId);
      return res.json(state);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);
/**
 * ======================================
 * AI CHAT (PATIENT)
 * ======================================
 */
router.post(
  '/ai-chat',
  authenticateToken,
  require('../controllers/patientAI.controller').chatWithAI
);
module.exports = router;
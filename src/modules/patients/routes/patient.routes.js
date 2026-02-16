console.log('🔥 PATIENT ROUTES FILE LOADED');

const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../../../middleware/auth');
const requireActiveSubscription = require('../../../middleware/requireActiveSubscription');

const patientProtocolController = require('../controllers/patientProtocol.controller');

router.post(
  '/me/protocols/:id/start',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolController.startProtocol
);

router.get(
  '/me/protocols/:id/current-phase',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolController.getCurrentPhase
);

router.post(
  '/me/protocols/:id/advance-phase',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolController.advancePhase
);

router.post(
  '/me/protocols/:id/daily-report',
  authenticateToken,
  requireActiveSubscription,
  patientProtocolController.submitDailyReport
);

module.exports = router;

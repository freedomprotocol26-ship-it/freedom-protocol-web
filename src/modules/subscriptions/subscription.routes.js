/**
 * Freedom Protocol - Subscription Routes
 */

const express = require('express');
const router = express.Router();

const subscriptionController =
  require('./subscription.controller');

const { authenticateToken } =
  require('../../middleware/auth');

/**
 * POST /subscriptions/trial
 */
router.post(
  '/trial',
  authenticateToken,
  subscriptionController.createTrial
);

/**
 * POST /subscriptions/extend
 */
router.post(
  '/extend',
  authenticateToken,
  subscriptionController.extend
);

/**
 * GET /subscriptions/status/:patientId
 */
router.get(
  '/status/:patientId',
  authenticateToken,
  subscriptionController.status
);

module.exports = router;

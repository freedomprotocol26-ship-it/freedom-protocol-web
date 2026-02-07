/**
 * Freedom Protocol - Subscription Routes
 */

const express = require('express');
const router = express.Router();

const subscriptionController =
  require('./subscription.controller');

const authenticate =
  require('../../middleware/auth.middleware');

/**
 * POST /subscriptions/trial
 */
router.post(
  '/trial',
  authenticate,
  subscriptionController.createTrial
);

/**
 * POST /subscriptions/extend
 */
router.post(
  '/extend',
  authenticate,
  subscriptionController.extend
);

/**
 * GET /subscriptions/status/:patientId
 */
router.get(
  '/status/:patientId',
  authenticate,
  subscriptionController.status
);

module.exports = router;

/**
 * Freedom Protocol - Subscription Routes
 * API endpoints for subscription management
 */

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticateJWT } = require('../middleware/auth');

/**
 * All subscription routes require authentication
 */

/**
 * POST /api/subscriptions
 * Create new subscription
 * 
 * Authentication: Required
 * 
 * Body:
 * {
 *   "patientId": 123,
 *   "planId": 2,
 *   "startDate": "2026-02-05",
 *   "endDate": "2026-03-05",
 *   "status": "trial"
 * }
 */
router.post(
  '/',
  authenticateJWT,
  subscriptionController.createSubscription
);

/**
 * GET /api/subscriptions/patient/:patientId/active
 * Get active subscription for a patient
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - patientId: Patient ID
 */
router.get(
  '/patient/:patientId/active',
  authenticateJWT,
  subscriptionController.getActiveSubscription
);

/**
 * GET /api/subscriptions/patient/:patientId/history
 * Get subscription history for a patient
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - patientId: Patient ID
 */
router.get(
  '/patient/:patientId/history',
  authenticateJWT,
  subscriptionController.getSubscriptionHistory
);

/**
 * POST /api/subscriptions/:subscriptionId/pay
 * Mark subscription as paid
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - subscriptionId: Subscription ID
 */
router.post(
  '/:subscriptionId/pay',
  authenticateJWT,
  subscriptionController.markSubscriptionPaid
);

/**
 * POST /api/subscriptions/:subscriptionId/cancel
 * Cancel subscription
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - subscriptionId: Subscription ID
 */
router.post(
  '/:subscriptionId/cancel',
  authenticateJWT,
  subscriptionController.cancelSubscription
);

/**
 * GET /api/subscriptions/:subscriptionId
 * Get subscription by ID
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - subscriptionId: Subscription ID
 */
router.get(
  '/:subscriptionId',
  authenticateJWT,
  subscriptionController.getSubscriptionById
);

module.exports = router;
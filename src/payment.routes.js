/**
 * Freedom Protocol - Payment Routes
 * API endpoints for payment operations
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateJWT } = require('../middleware/auth');

/**
 * POST /api/payments/initialize
 * Initialize Paystack payment
 * 
 * Authentication: Required
 * 
 * Body:
 * {
 *   "email": "patient@example.com",
 *   "amount": 95.00,
 *   "callbackUrl": "https://app.com/payment/callback",
 *   "metadata": { "subscription_id": 123 }
 * }
 */
router.post(
  '/initialize',
  authenticateJWT,
  paymentController.initializePayment
);

/**
 * POST /api/payments/verify
 * Verify payment and update subscription
 * 
 * Authentication: Required
 * 
 * Body:
 * {
 *   "reference": "FP-1234567890-abc",
 *   "subscriptionId": 123
 * }
 */
router.post(
  '/verify',
  authenticateJWT,
  paymentController.verifyPayment
);

/**
 * POST /api/payments/webhook
 * Handle Paystack webhook
 * 
 * Authentication: NOT Required (Paystack webhook)
 * 
 * Headers:
 * - x-paystack-signature: Webhook signature
 */
router.post(
  '/webhook',
  paymentController.handleWebhook
);

/**
 * GET /api/payments/reference/:reference
 * Get payment by reference
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - reference: Payment reference
 */
router.get(
  '/reference/:reference',
  authenticateJWT,
  paymentController.getPaymentByReference
);

/**
 * GET /api/payments/subscription/:subscriptionId/history
 * Get payment history for subscription
 * 
 * Authentication: Required
 * 
 * URL Parameters:
 * - subscriptionId: Subscription ID
 */
router.get(
  '/subscription/:subscriptionId/history',
  authenticateJWT,
  paymentController.getPaymentHistory
);

module.exports = router;
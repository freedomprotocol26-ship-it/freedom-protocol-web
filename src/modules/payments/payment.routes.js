/**
 * Freedom Protocol - Payment Routes
 * API endpoints for payment operations
 */

const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const authenticateJWT = require('../../middleware/auth.middleware');

/**
 * POST /payments/initiate
 */
router.post(
  '/initiate',
  authenticateJWT,
  paymentController.initiatePayment
);

/**
 * POST /payments/confirm
 */
router.post(
  '/confirm',
  authenticateJWT,
  paymentController.confirmPayment
);

module.exports = router;

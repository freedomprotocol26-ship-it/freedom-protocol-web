/**
 * Payment Routes
 * Freedom Protocol - Payment Domain
 */

const express = require('express');
const router = express.Router();

const paymentController = require('./payment.controller');

/**
 * POST /payments/checkout
 * Create payment checkout session
 */
router.post('/checkout', paymentController.createCheckout);

/**
 * POST /payments/success
 * Handle successful payment
 */
router.post('/success', paymentController.paymentSuccess);

/**
 * POST /payments/failure
 * Handle failed payment
 */
router.post('/failure', paymentController.paymentFailure);

module.exports = router;

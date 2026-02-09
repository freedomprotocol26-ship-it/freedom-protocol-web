/**
 * Payment Controller
 * HTTP layer for payment operations
 * No SQL - delegates to service layer
 * No business logic - just request/response handling
 */

const paymentService = require('./payment.service');

/**
 * Create checkout session
 * POST /api/payments/checkout
 * @param {Object} req.body - { patientId, plan, amount }
 * @returns {Object} { success: true, providerReference }
 */
async function createCheckout(req, res) {
  try {
    const { patientId, plan, amount } = req.body;

    // Validate request body
    if (!patientId || !plan || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, plan, amount'
      });
    }

    // Generate fake provider reference (temporary until real Stripe integration)
    const providerReference = `stripe_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create pending payment
    await paymentService.createPendingPayment({
      patientId,
      plan,
      amount,
      providerReference
    });

    return res.status(201).json({
      success: true,
      providerReference
    });

  } catch (error) {
    console.error('Create checkout error:', error);

    // Handle validation errors
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Handle server errors
    return res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
}

/**
 * Handle successful payment
 * POST /api/payments/success
 * @param {Object} req.body - { providerReference }
 * @returns {Object} { success: true }
 */
async function paymentSuccess(req, res) {
  try {
    const { providerReference } = req.body;

    // Validate request body
    if (!providerReference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: providerReference'
      });
    }

    // Handle successful payment
    await paymentService.handleSuccessfulPayment(providerReference);

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('Payment success error:', error);

    // Handle validation errors (payment not found, etc.)
    if (error.message.includes('not found') || error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Handle server errors
    return res.status(500).json({
      success: false,
      error: 'Failed to process successful payment'
    });
  }
}

/**
 * Handle failed payment
 * POST /api/payments/failure
 * @param {Object} req.body - { providerReference }
 * @returns {Object} { success: false }
 */
async function paymentFailure(req, res) {
  try {
    const { providerReference } = req.body;

    // Validate request body
    if (!providerReference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: providerReference'
      });
    }

    // Handle failed payment
    await paymentService.handleFailedPayment(providerReference);

    return res.status(200).json({
      success: false
    });

  } catch (error) {
    console.error('Payment failure error:', error);

    // Handle validation errors (payment not found, etc.)
    if (error.message.includes('not found') || error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Handle server errors
    return res.status(500).json({
      success: false,
      error: 'Failed to process failed payment'
    });
  }
}

module.exports = {
  createCheckout,
  paymentSuccess,
  paymentFailure
};
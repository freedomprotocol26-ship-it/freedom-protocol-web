/**
 * Freedom Protocol - Subscription Controller
 */

const subscriptionService = require('./subscription.service');

/**
 * POST /subscriptions/trial
 */
async function createTrial(req, res) {
  try {
    const { patientId } = req.body;

    const subscription =
      await subscriptionService.createTrialSubscription(patientId);

    res.status(201).json({
      success: true,
      subscription
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message
    });
  }
}

/**
 * POST /subscriptions/extend
 */
async function extend(req, res) {
  try {
    const { patientId, plan } = req.body;

    const subscription =
      await subscriptionService.extendSubscription(patientId, plan);

    res.status(201).json({
      success: true,
      subscription
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message
    });
  }
}

/**
 * GET /subscriptions/status/:patientId
 */
async function status(req, res) {
  try {
    const patientId = req.params.patientId;

    const result =
      await subscriptionService.isSubscriptionActive(patientId);

    res.json({
      success: true,
      result
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message
    });
  }
}

module.exports = {
  createTrial,
  extend,
  status
};

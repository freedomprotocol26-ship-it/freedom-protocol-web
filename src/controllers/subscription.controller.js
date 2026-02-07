/**
 * Freedom Protocol - Subscription Controller
 * HTTP handlers for subscription endpoints
 */

const subscriptionService = require('../services/subscription.service');
const controllerErrorHandler = require('./controllerErrorHandler');

/**
 * Create new subscription
 * POST /api/subscriptions
 * 
 * Body:
 * {
 *   "patientId": 123,
 *   "planId": 2,
 *   "startDate": "2026-02-05",
 *   "endDate": "2026-03-05",
 *   "status": "trial"
 * }
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSubscription = controllerErrorHandler(async (req, res) => {
  const { patientId, planId, startDate, endDate, status } = req.body;

  const subscription = await subscriptionService.createSubscription(
    patientId,
    planId,
    startDate,
    endDate,
    status
  );

  res.status(201).json({
    success: true,
    message: 'Subscription created successfully',
    data: subscription,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get active subscription for patient
 * GET /api/subscriptions/patient/:patientId/active
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getActiveSubscription = controllerErrorHandler(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);

  const subscription = await subscriptionService.getActiveSubscription(patientId);

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'No active subscription found',
      data: null,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    message: 'Active subscription retrieved successfully',
    data: subscription,
    timestamp: new Date().toISOString()
  });
});

/**
 * Mark subscription as paid
 * POST /api/subscriptions/:subscriptionId/pay
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markSubscriptionPaid = controllerErrorHandler(async (req, res) => {
  const subscriptionId = parseInt(req.params.subscriptionId, 10);

  const subscription = await subscriptionService.markSubscriptionPaid(subscriptionId);

  res.status(200).json({
    success: true,
    message: 'Subscription marked as paid successfully',
    data: subscription,
    timestamp: new Date().toISOString()
  });
});

/**
 * Cancel subscription
 * POST /api/subscriptions/:subscriptionId/cancel
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelSubscription = controllerErrorHandler(async (req, res) => {
  const subscriptionId = parseInt(req.params.subscriptionId, 10);

  const subscription = await subscriptionService.cancelSubscription(subscriptionId);

  res.status(200).json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: subscription,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get subscription history for patient
 * GET /api/subscriptions/patient/:patientId/history
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubscriptionHistory = controllerErrorHandler(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);

  const subscriptions = await subscriptionService.getSubscriptionHistory(patientId);

  res.status(200).json({
    success: true,
    message: 'Subscription history retrieved successfully',
    data: {
      patientId: patientId,
      subscriptions: subscriptions,
      total: subscriptions.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get subscription by ID
 * GET /api/subscriptions/:subscriptionId
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSubscriptionById = controllerErrorHandler(async (req, res) => {
  const subscriptionId = parseInt(req.params.subscriptionId, 10);

  const subscription = await subscriptionService.getSubscriptionById(subscriptionId);

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found',
      data: null,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    success: true,
    message: 'Subscription retrieved successfully',
    data: subscription,
    timestamp: new Date().toISOString()
  });
});

module.exports = {
  createSubscription,
  getActiveSubscription,
  markSubscriptionPaid,
  cancelSubscription,
  getSubscriptionHistory,
  getSubscriptionById
};
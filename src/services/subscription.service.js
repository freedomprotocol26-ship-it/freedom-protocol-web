/**
 * Freedom Protocol - Subscription Service
 * Business logic for subscription management
 */

const BaseError = require('../errors/baseError');
const subscriptionRepository = require('../repositories/subscription.repository');

/**
 * Allowed subscription statuses
 */
const ALLOWED_STATUSES = ['trial', 'active', 'expired', 'cancelled'];

/**
 * Create new subscription
 */
const createSubscription = async (patientId, planId, startDate, endDate, status) => {
  try {
    if (!patientId) {
      throw new BaseError('Patient ID is required', 400, 'MISSING_PATIENT_ID');
    }

    if (!planId) {
      throw new BaseError('Plan ID is required', 400, 'MISSING_PLAN_ID');
    }

    if (!startDate) {
      throw new BaseError('Start date is required', 400, 'MISSING_START_DATE');
    }

    if (!endDate) {
      throw new BaseError('End date is required', 400, 'MISSING_END_DATE');
    }

    if (!status) {
      throw new BaseError('Status is required', 400, 'MISSING_STATUS');
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      throw new BaseError(
        `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
        400,
        'INVALID_STATUS'
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BaseError('Invalid date format', 400, 'INVALID_DATE');
    }

    if (end <= start) {
      throw new BaseError('End date must be after start date', 400, 'INVALID_DATE_RANGE');
    }

    const existing = await subscriptionRepository.getActiveSubscriptionByPatient(patientId);

    if (existing) {
      throw new BaseError(
        'Patient already has an active subscription',
        409,
        'SUBSCRIPTION_EXISTS'
      );
    }

    return await subscriptionRepository.createSubscription(
      patientId,
      planId,
      start,
      end,
      status
    );
  } catch (error) {
    if (error instanceof BaseError) throw error;

    console.error('createSubscription error:', error);
    throw new BaseError('Subscription creation failed', 500, 'SUBSCRIPTION_ERROR');
  }
};

/**
 * Get active subscription
 */
const getActiveSubscription = async (patientId) => {
  try {
    if (!patientId) {
      throw new BaseError('Patient ID is required', 400, 'MISSING_PATIENT_ID');
    }

    return await subscriptionRepository.getActiveSubscriptionByPatient(patientId);
  } catch (error) {
    if (error instanceof BaseError) throw error;

    console.error('getActiveSubscription error:', error);
    throw new BaseError('Failed to retrieve subscription', 500, 'SUBSCRIPTION_RETRIEVAL_ERROR');
  }
};

/**
 * Mark subscription as paid
 */
const markSubscriptionPaid = async (subscriptionId) => {
  try {
    if (!subscriptionId) {
      throw new BaseError('Subscription ID is required', 400, 'MISSING_SUBSCRIPTION_ID');
    }

    const sub = await subscriptionRepository.getSubscriptionById(subscriptionId);

    if (!sub) {
      throw new BaseError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.is_paid) {
      throw new BaseError('Subscription already paid', 400, 'ALREADY_PAID');
    }

    if (['cancelled', 'expired'].includes(sub.status)) {
      throw new BaseError(
        `Cannot mark ${sub.status} subscription as paid`,
        400,
        'INVALID_STATUS'
      );
    }

    return await subscriptionRepository.markSubscriptionPaid(subscriptionId);
  } catch (error) {
    if (error instanceof BaseError) throw error;

    console.error('markSubscriptionPaid error:', error);
    throw new BaseError('Payment update failed', 500, 'PAYMENT_UPDATE_ERROR');
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    if (!subscriptionId) {
      throw new BaseError('Subscription ID is required', 400, 'MISSING_SUBSCRIPTION_ID');
    }

    const sub = await subscriptionRepository.getSubscriptionById(subscriptionId);

    if (!sub) {
      throw new BaseError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.status === 'cancelled') {
      throw new BaseError('Subscription already cancelled', 400, 'ALREADY_CANCELLED');
    }

    if (sub.status === 'expired') {
      throw new BaseError('Cannot cancel expired subscription', 400, 'SUBSCRIPTION_EXPIRED');
    }

    return await subscriptionRepository.cancelSubscription(subscriptionId);
  } catch (error) {
    if (error instanceof BaseError) throw error;

    console.error('cancelSubscription error:', error);
    throw new BaseError('Cancellation failed', 500, 'CANCELLATION_ERROR');
  }
};

/**
 * Get subscription history
 */
const getSubscriptionHistory = async (patientId) => {
  try {
    if (!patientId) {
      throw new BaseError('Patient ID is required', 400, 'MISSING_PATIENT_ID');
    }

    return await subscriptionRepository.getSubscriptionsByPatient(patientId);
  } catch (error) {
    if (error instanceof BaseError) throw error;

    console.error('getSubscriptionHistory error:', error);
    throw new BaseError('Failed to retrieve history', 500, 'SUBSCRIPTION_HISTORY_ERROR');
  }
};

/**
 * Expire subscriptions in bulk
 */
const processExpiredSubscriptions = async () => {
  try {
    const expired = await subscriptionRepository.getExpiredSubscriptions();

    let processed = 0;

    for (const sub of expired) {
      await subscriptionRepository.expireSubscription(sub.id);
      processed++;
    }

    return { processed };
  } catch (error) {
    console.error('processExpiredSubscriptions error:', error);
    throw new BaseError('Expiration process failed', 500, 'EXPIRATION_PROCESS_ERROR');
  }
};

module.exports = {
  createSubscription,
  getActiveSubscription,
  markSubscriptionPaid,
  cancelSubscription,
  getSubscriptionHistory,
  processExpiredSubscriptions
};

/**
 * Freedom Protocol - Subscription Service
 * Business logic only
 */

const BaseError = require('../../errors/baseError');
const subscriptionRepository = require('./subscription.repository');

const PLAN_DAYS = {
  trial: 7,
  '3m': 90,
  '6m': 180,
  '12m': 365
};

/**
 * Create 7-day trial
 */
async function createTrialSubscription(patientId) {
  if (!patientId) {
    throw new BaseError("Patient ID required", 400);
  }

  const existing =
    await subscriptionRepository.getActiveSubscriptionByPatient(patientId);

  if (existing) {
    throw new BaseError("Patient already has active subscription", 409);
  }

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + PLAN_DAYS.trial);

  return subscriptionRepository.createSubscription({
    patient_id: patientId,
    plan: 'trial',
    starts_at: startsAt,
    ends_at: endsAt,
    status: 'active'
  });
}

/**
 * Check active subscription
 */
async function isSubscriptionActive(patientId) {
  if (!patientId) {
    throw new BaseError("Patient ID required", 400);
  }

  const subscription =
    await subscriptionRepository.getActiveSubscriptionByPatient(patientId);

  if (!subscription) {
    return { active: false };
  }

  return {
    active: true,
    subscription
  };
}

/**
 * Extend subscription
 */
async function extendSubscription(patientId, plan) {
  if (!PLAN_DAYS[plan]) {
    throw new BaseError("Invalid plan", 400);
  }

  const current =
    await subscriptionRepository.getActiveSubscriptionByPatient(patientId);

  if (current) {
    await subscriptionRepository.expireSubscription(current.id);
  }

  const startsAt = new Date();
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + PLAN_DAYS[plan]);

  return subscriptionRepository.createSubscription({
    patient_id: patientId,
    plan,
    starts_at: startsAt,
    ends_at: endsAt,
    status: 'active'
  });
}

module.exports = {
  createTrialSubscription,
  isSubscriptionActive,
  extendSubscription
};

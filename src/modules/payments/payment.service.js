/**
 * Freedom Protocol - Payment Service
 * Business logic for payment processing
 */

const BaseError = require('../../errors/baseError');
const paymentRepository = require('./payment.repository');
const subscriptionService = require('../subscriptions/subscription.service');

/**
 * Plan pricing in pesewas (GHS * 100)
 */
const PLAN_PRICING = {
  '3m': 28500,
  '6m': 51300,
  '12m': 91200
};

/**
 * Initiate payment
 */
async function initiatePayment(patientId, plan) {

  if (!patientId) {
    throw new BaseError("Patient ID required", 400);
  }

  if (!PLAN_PRICING[plan]) {
    throw new BaseError("Invalid plan", 400);
  }

  const amount = PLAN_PRICING[plan];

  const reference =
    `FP-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const payment = await paymentRepository.createPayment({
    patient_id: patientId,
    subscription_plan: plan,
    amount,
    currency: 'GHS',
    provider: 'simulated',
    provider_reference: reference,
    status: 'pending'
  });

  return {
    paymentId: payment.id,
    reference,
    amount,
    currency: 'GHS',
    plan,
    status: 'pending'
  };
}

/**
 * Confirm payment and extend subscription
 */
async function confirmPayment(patientId, plan, reference) {

  if (!patientId || !plan || !reference) {
    throw new BaseError("Missing fields", 400);
  }

  const payment =
    await paymentRepository.getPaymentByProviderReference(reference);

  if (!payment) {
    throw new BaseError("Payment not found", 404);
  }

  if (payment.status === 'success') {
    throw new BaseError("Payment already confirmed", 409);
  }

  await paymentRepository.updatePaymentStatus(
    payment.id,
    'success'
  );

  const subscription =
    await subscriptionService.extendSubscription(patientId, plan);

  return {
    paymentId: payment.id,
    status: 'success',
    subscription
  };
}

module.exports = {
  initiatePayment,
  confirmPayment,
  PLAN_PRICING
};

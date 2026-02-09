/**
 * Payment Service
 * Business logic layer for payment operations
 */

const paymentRepository = require('./payment.repository');
const subscriptionService = require('../subscriptions/subscription.service');

async function createPendingPayment({ patientId, plan, amount, providerReference }) {
  if (!patientId) throw new Error('Patient ID is required');
  if (!plan) throw new Error('Plan is required');
  if (!amount || amount <= 0) throw new Error('Valid amount is required');
  if (!providerReference) throw new Error('Provider reference is required');

  const validPlans = ['3m', '6m', '12m'];
  if (!validPlans.includes(plan)) {
    throw new Error('Invalid plan');
  }

  const paymentData = {
    patient_id: patientId,
    plan,
    amount,
    currency: 'USD',
    provider: 'stripe',
    provider_reference: providerReference,
    status: 'pending'
  };

  return paymentRepository.createPayment(paymentData);
}

async function handleSuccessfulPayment(providerReference) {
  if (!providerReference) throw new Error('Provider reference is required');

  const payment =
    await paymentRepository.getPaymentByProviderReference(providerReference);

  if (!payment) throw new Error('Payment not found');

  if (payment.status === 'succeeded') {
    return payment;
  }

  const updatedPayment =
    await paymentRepository.updatePaymentStatus(providerReference, 'succeeded');

  await subscriptionService.extendSubscription(
    payment.patient_id,
    payment.plan
  );

  return updatedPayment;
}

async function handleFailedPayment(providerReference) {
  if (!providerReference) throw new Error('Provider reference is required');

  const payment =
    await paymentRepository.getPaymentByProviderReference(providerReference);

  if (!payment) throw new Error('Payment not found');

  return paymentRepository.updatePaymentStatus(
    providerReference,
    'failed'
  );
}

module.exports = {
  createPendingPayment,
  handleSuccessfulPayment,
  handleFailedPayment
};

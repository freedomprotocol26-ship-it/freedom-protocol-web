/**
 * Payment Repository
 * Data access layer for payment operations
 */

const db = require('../../db');

/**
 * Create a new payment record
 */
async function createPayment(data) {
  const query = `
    INSERT INTO payments (
      patient_id,
      plan,
      amount,
      currency,
      provider,
      provider_reference,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const values = [
    data.patient_id,
    data.plan,
    data.amount,
    data.currency,
    data.provider,
    data.provider_reference,
    data.status
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Update payment status by provider reference
 */
async function updatePaymentStatus(providerReference, status) {
  const query = `
    UPDATE payments
    SET status = $1
    WHERE provider_reference = $2
    RETURNING *
  `;

  const result = await db.query(query, [status, providerReference]);
  return result.rows[0] || null;
}

/**
 * Get payment by provider reference
 */
async function getPaymentByProviderReference(providerReference) {
  const query = `
    SELECT *
    FROM payments
    WHERE provider_reference = $1
    LIMIT 1
  `;

  const result = await db.query(query, [providerReference]);
  return result.rows[0] || null;
}

module.exports = {
  createPayment,
  updatePaymentStatus,
  getPaymentByProviderReference
};

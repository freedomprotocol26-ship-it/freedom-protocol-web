/**
 * Freedom Protocol - Payment Repository
 * Database queries for payment operations
 */

const db = require('../../db');

const createPayment = async (data) => {
  const query = `
    INSERT INTO payments (
      patient_id,
      subscription_plan,
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
    data.subscription_plan,
    data.amount,
    data.currency,
    data.provider,
    data.provider_reference,
    data.status
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

const updatePaymentStatus = async (paymentId, status) => {
  const query = `
    UPDATE payments
    SET status = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await db.query(query, [status, paymentId]);
  return result.rows[0] || null;
};

const getPaymentByProviderReference = async (providerReference) => {
  const query = `
    SELECT *
    FROM payments
    WHERE provider_reference = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await db.query(query, [providerReference]);
  return result.rows[0] || null;
};

module.exports = {
  createPayment,
  updatePaymentStatus,
  getPaymentByProviderReference
};

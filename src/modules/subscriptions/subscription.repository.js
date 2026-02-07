/**
 * Freedom Protocol - Subscription Repository
 * Database queries for subscription operations
 */

const db = require('../../db');

/**
 * Create new subscription
 */
async function createSubscription(data) {
  const query = `
    INSERT INTO subscriptions (patient_id, plan, starts_at, ends_at, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    data.patient_id,
    data.plan,
    data.starts_at,
    data.ends_at,
    data.status
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Get active subscription for patient
 */
async function getActiveSubscriptionByPatient(patientId) {
  const query = `
    SELECT *
    FROM subscriptions
    WHERE patient_id = $1
      AND status = 'active'
      AND ends_at > NOW()
    LIMIT 1
  `;

  const result = await db.query(query, [patientId]);
  return result.rows[0] || null;
}

/**
 * Expire subscription by id
 */
async function expireSubscription(subscriptionId) {
  const query = `
    UPDATE subscriptions
    SET status = 'expired'
    WHERE id = $1
    RETURNING *
  `;

  const result = await db.query(query, [subscriptionId]);
  return result.rows[0] || null;
}

module.exports = {
  createSubscription,
  getActiveSubscriptionByPatient,
  expireSubscription
};

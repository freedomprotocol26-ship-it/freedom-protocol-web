/**
 * Freedom Protocol - Subscription Repository
 * Database queries for subscription operations
 */

const db = require('../db');

/**
 * Create new subscription
 * 
 * @param {number} patientId - Patient ID
 * @param {number} planId - Subscription plan ID
 * @param {Date} startDate - Subscription start date
 * @param {Date} endDate - Subscription end date
 * @param {string} status - Subscription status (trial, active, expired, cancelled)
 * @returns {Promise<Object>} Created subscription object
 */
const createSubscription = async (patientId, planId, startDate, endDate, status) => {
  const query = `
    INSERT INTO subscriptions (
      patient_id,
      plan_id,
      start_date,
      end_date,
      status
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING 
      id,
      patient_id,
      plan_id,
      start_date,
      end_date,
      status,
      is_paid,
      created_at,
      updated_at
  `;
  
  const values = [patientId, planId, startDate, endDate, status];
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get active subscription by patient ID
 * Returns the most recent active or trial subscription
 * 
 * @param {number} patientId - Patient ID
 * @returns {Promise<Object|null>} Active subscription object or null if not found
 */
const getActiveSubscriptionByPatient = async (patientId) => {
  const query = `
    SELECT 
      s.id,
      s.patient_id,
      s.plan_id,
      s.start_date,
      s.end_date,
      s.status,
      s.is_paid,
      s.created_at,
      s.updated_at,
      p.name as plan_name,
      p.price as plan_price,
      p.tier as plan_tier
    FROM subscriptions s
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.patient_id = $1
      AND s.status IN ('active', 'trial')
      AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  
  const result = await db.query(query, [patientId]);
  return result.rows[0] || null;
};

/**
 * Expire subscription
 * Sets status to 'expired' and end_date to current date if not already set
 * 
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<Object|null>} Updated subscription object or null if not found
 */
const expireSubscription = async (subscriptionId) => {
  const query = `
    UPDATE subscriptions
    SET status = 'expired',
        end_date = COALESCE(end_date, CURRENT_DATE),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING 
      id,
      patient_id,
      plan_id,
      start_date,
      end_date,
      status,
      is_paid,
      created_at,
      updated_at
  `;
  
  const result = await db.query(query, [subscriptionId]);
  return result.rows[0] || null;
};

/**
 * Mark subscription as paid
 * Updates is_paid flag and optionally status to 'active'
 * 
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<Object|null>} Updated subscription object or null if not found
 */
const markSubscriptionPaid = async (subscriptionId) => {
  const query = `
    UPDATE subscriptions
    SET is_paid = true,
        status = CASE 
          WHEN status = 'trial' THEN 'active'
          ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING 
      id,
      patient_id,
      plan_id,
      start_date,
      end_date,
      status,
      is_paid,
      created_at,
      updated_at
  `;
  
  const result = await db.query(query, [subscriptionId]);
  return result.rows[0] || null;
};

/**
 * Get expired subscriptions
 * Returns all subscriptions that have passed their end_date but not marked as expired
 * 
 * @returns {Promise<Array>} Array of expired subscription objects
 */
const getExpiredSubscriptions = async () => {
  const query = `
    SELECT 
      s.id,
      s.patient_id,
      s.plan_id,
      s.start_date,
      s.end_date,
      s.status,
      s.is_paid,
      s.created_at,
      s.updated_at,
      p.id as patient_user_id,
      u.email as patient_email,
      u.name as patient_name
    FROM subscriptions s
    INNER JOIN patients p ON s.patient_id = p.id
    INNER JOIN users u ON p.user_id = u.id
    WHERE s.end_date < CURRENT_DATE
      AND s.status IN ('active', 'trial')
    ORDER BY s.end_date ASC
  `;
  
  const result = await db.query(query);
  return result.rows;
};

/**
 * Get subscription by ID
 * 
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<Object|null>} Subscription object or null if not found
 */
const getSubscriptionById = async (subscriptionId) => {
  const query = `
    SELECT 
      s.id,
      s.patient_id,
      s.plan_id,
      s.start_date,
      s.end_date,
      s.status,
      s.is_paid,
      s.created_at,
      s.updated_at,
      p.name as plan_name,
      p.price as plan_price,
      p.tier as plan_tier
    FROM subscriptions s
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.id = $1
  `;
  
  const result = await db.query(query, [subscriptionId]);
  return result.rows[0] || null;
};

/**
 * Get all subscriptions by patient ID
 * Returns subscription history for a patient
 * 
 * @param {number} patientId - Patient ID
 * @returns {Promise<Array>} Array of subscription objects
 */
const getSubscriptionsByPatient = async (patientId) => {
  const query = `
    SELECT 
      s.id,
      s.patient_id,
      s.plan_id,
      s.start_date,
      s.end_date,
      s.status,
      s.is_paid,
      s.created_at,
      s.updated_at,
      p.name as plan_name,
      p.price as plan_price,
      p.tier as plan_tier
    FROM subscriptions s
    LEFT JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.patient_id = $1
    ORDER BY s.created_at DESC
  `;
  
  const result = await db.query(query, [patientId]);
  return result.rows;
};

/**
 * Cancel subscription
 * Sets status to 'cancelled' and end_date to current date
 * 
 * @param {number} subscriptionId - Subscription ID
 * @returns {Promise<Object|null>} Updated subscription object or null if not found
 */
const cancelSubscription = async (subscriptionId) => {
  const query = `
    UPDATE subscriptions
    SET status = 'cancelled',
        end_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING 
      id,
      patient_id,
      plan_id,
      start_date,
      end_date,
      status,
      is_paid,
      created_at,
      updated_at
  `;
  
  const result = await db.query(query, [subscriptionId]);
  return result.rows[0] || null;
};

module.exports = {
  createSubscription,
  getActiveSubscriptionByPatient,
  expireSubscription,
  markSubscriptionPaid,
  getExpiredSubscriptions,
  getSubscriptionById,
  getSubscriptionsByPatient,
  cancelSubscription
};
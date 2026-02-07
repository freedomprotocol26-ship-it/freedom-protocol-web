/**
 * Freedom Protocol - Earnings Repository
 * Handles earnings and payouts data access
 */

const db = require('../db');

/**
 * Get total earnings for doctor
 */
const getDoctorTotalEarnings = async (doctorId) => {

  const query = `
    SELECT COALESCE(SUM(net_amount), 0) AS total
    FROM earnings
    WHERE facility_id IN (
      SELECT facility_id
      FROM users
      WHERE id = $1
    )
  `;

  const result = await db.query(query, [doctorId]);
  return Number(result.rows[0].total);
};

/**
 * Get doctor transactions
 */
const getDoctorTransactions = async (doctorId) => {

  const query = `
    SELECT
      id,
      subscription_id,
      amount,
      platform_fee,
      net_amount,
      status,
      created_at
    FROM earnings
    WHERE facility_id IN (
      SELECT facility_id
      FROM users
      WHERE id = $1
    )
    ORDER BY created_at DESC
    LIMIT 20
  `;

  const result = await db.query(query, [doctorId]);
  return result.rows;
};

module.exports = {
  getDoctorTotalEarnings,
  getDoctorTransactions
};

/**
 * Freedom Protocol - Facility Repository
 */

const db = require('../db');

/**
 * Get facility by ID
 */
const getFacilityById = async (facilityId) => {

  const query = `
    SELECT
      id,
      name,
      address,
      phone,
      email,
      is_active,
      created_at
    FROM facilities
    WHERE id = $1
  `;

  const result = await db.query(query, [facilityId]);
  return result.rows[0] || null;
};

/**
 * Get doctors by facility
 */
const getFacilityDoctors = async (facilityId) => {

  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role
    FROM users u
    WHERE u.facility_id = $1
      AND u.role = 'doctor'
  `;

  const result = await db.query(query, [facilityId]);
  return result.rows;
};

/**
 * Get facility earnings
 */
const getFacilityEarnings = async (facilityId) => {

  const query = `
    SELECT
      id,
      amount,
      platform_fee,
      net_amount,
      status,
      created_at
    FROM earnings
    WHERE facility_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [facilityId]);
  return result.rows;
};

module.exports = {
  getFacilityById,
  getFacilityDoctors,
  getFacilityEarnings
};

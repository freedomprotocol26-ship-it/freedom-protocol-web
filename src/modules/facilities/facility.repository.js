// src/modules/facilities/facility.repository.js

const pool = require('../../db');

/**
 * Insert facility
 */
async function createFacility(ownerUserId, name) {
  const query = `
    INSERT INTO facilities (owner_user_id, name)
    VALUES ($1, $2)
    RETURNING id, name, owner_user_id AS "ownerUserId", created_at AS "createdAt"
  `;

  const { rows } = await pool.query(query, [ownerUserId, name]);
  return rows[0];
}

/**
 * Assign doctor to facility
 */
async function assignDoctorToFacility(doctorId, facilityId) {
  const query = `
    INSERT INTO doctor_facilities (doctor_id, facility_id)
    VALUES ($1, $2)
    RETURNING doctor_id AS "doctorId", facility_id AS "facilityId"
  `;

  const { rows } = await pool.query(query, [doctorId, facilityId]);
  return rows[0];
}

/**
 * Get doctors in facility
 */
async function getFacilityDoctors(facilityId) {
  const query = `
    SELECT 
      u.id,
      u.email,
      u.role
    FROM doctor_facilities df
    JOIN users u ON u.id = df.doctor_id
    WHERE df.facility_id = $1
  `;

  const { rows } = await pool.query(query, [facilityId]);
  return rows;
}

module.exports = {
  createFacility,
  assignDoctorToFacility,
  getFacilityDoctors
};

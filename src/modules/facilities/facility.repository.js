// src/modules/facilities/facility.repository.js
/**
 * Freedom Protocol - Facility Repository
 * Database queries for facility operations
 */

const db = require('../../db');

/**
 * Create new facility
 * 
 * @param {Object} data - Facility data
 * @param {string} data.name - Facility name
 * @param {string} data.owner_user_id - Owner user UUID
 * @returns {Promise<Object>} Created facility
 */
const createFacility = async (data) => {
  const query = `
    INSERT INTO facilities (name, owner_user_id)
    VALUES ($1, $2)
    RETURNING *
  `;
  
  const values = [data.name, data.owner_user_id];
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get facility by ID
 * 
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<Object|null>} Facility or null
 */
const getFacilityById = async (facilityId) => {
  const query = `
    SELECT *
    FROM facilities
    WHERE id = $1
  `;
  
  const result = await db.query(query, [facilityId]);
  return result.rows[0] || null;
};

/**
 * Get facilities by owner user ID
 * 
 * @param {string} ownerUserId - Owner user UUID
 * @returns {Promise<Array>} Array of facilities
 */
const getFacilitiesByOwner = async (ownerUserId) => {
  const query = `
    SELECT *
    FROM facilities
    WHERE owner_user_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await db.query(query, [ownerUserId]);
  return result.rows;
};

/**
 * Assign doctor to facility
 * 
 * @param {string} doctorId - Doctor user UUID
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<Object>} Assignment record
 */
const assignDoctorToFacility = async (doctorId, facilityId) => {
  const query = `
    INSERT INTO doctor_facilities (doctor_id, facility_id)
    VALUES ($1, $2)
    ON CONFLICT (doctor_id, facility_id) DO NOTHING
    RETURNING *
  `;
  
  const values = [doctorId, facilityId];
  
  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Check if doctor is assigned to facility
 * 
 * @param {string} doctorId - Doctor user UUID
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<boolean>} True if assigned
 */
const isDoctorAssignedToFacility = async (doctorId, facilityId) => {
  const query = `
    SELECT 1
    FROM doctor_facilities
    WHERE doctor_id = $1
      AND facility_id = $2
  `;
  
  const result = await db.query(query, [doctorId, facilityId]);
  return result.rows.length > 0;
};

/**
 * Get doctors assigned to facility
 * 
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<Array>} Array of doctors with assignment info
 */
const getDoctorsByFacility = async (facilityId) => {
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      df.assigned_at
    FROM doctor_facilities df
    INNER JOIN users u ON df.doctor_id = u.id
    WHERE df.facility_id = $1
    ORDER BY df.assigned_at DESC
  `;
  
  const result = await db.query(query, [facilityId]);
  return result.rows;
};

/**
 * Get facilities assigned to doctor
 * 
 * @param {string} doctorId - Doctor user UUID
 * @returns {Promise<Array>} Array of facilities
 */
const getFacilitiesByDoctor = async (doctorId) => {
  const query = `
    SELECT 
      f.*,
      df.assigned_at
    FROM doctor_facilities df
    INNER JOIN facilities f ON df.facility_id = f.id
    WHERE df.doctor_id = $1
    ORDER BY df.assigned_at DESC
  `;
  
  const result = await db.query(query, [doctorId]);
  return result.rows;
};

/**
 * Remove doctor from facility
 * 
 * @param {string} doctorId - Doctor user UUID
 * @param {string} facilityId - Facility UUID
 * @returns {Promise<boolean>} True if removed
 */
const removeDoctorFromFacility = async (doctorId, facilityId) => {
  const query = `
    DELETE FROM doctor_facilities
    WHERE doctor_id = $1
      AND facility_id = $2
    RETURNING *
  `;
  
  const result = await db.query(query, [doctorId, facilityId]);
  return result.rows.length > 0;
};

module.exports = {
  createFacility,
  getFacilityById,
  getFacilitiesByOwner,
  assignDoctorToFacility,
  isDoctorAssignedToFacility,
  getDoctorsByFacility,
  getFacilitiesByDoctor,
  removeDoctorFromFacility
};
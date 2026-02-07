/**
 * Freedom Protocol - Doctor Repository
 */

const db = require('../db');

/**
 * Get doctor profile by user id
 */
const getDoctorByUserId = async (userId) => {

  const query = `
    SELECT
      id,
      user_id,
      specialty,
      status,
      created_at
    FROM doctors
    WHERE user_id = $1
  `;

  const result = await db.query(query, [userId]);
  return result.rows[0] || null;
};

/**
 * Get total consultations
 */
const getDoctorConsultationCount = async (doctorId) => {

  const query = `
    SELECT COUNT(*) AS total
    FROM care_episodes
    WHERE doctor_id = $1
  `;

  const result = await db.query(query, [doctorId]);
  return Number(result.rows[0].total);
};

module.exports = {
  getDoctorByUserId,
  getDoctorConsultationCount
};

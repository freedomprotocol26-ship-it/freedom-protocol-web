const pool = require('../../../db');

/**
 * Get Doctor Dashboard Summary
 */
exports.getDashboardSummary = async (doctorId) => {
  const result = await pool.query(
    `SELECT COUNT(*) 
     FROM patients 
     WHERE doctor_id = $1`,
    [doctorId]
  );

  return {
    totalPatients: parseInt(result.rows[0].count, 10)
  };
};

/**
 * Get Doctor Patients
 */
exports.getDoctorPatients = async (doctorId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email
     FROM patients
     WHERE doctor_id = $1
     ORDER BY created_at DESC`,
    [doctorId]
  );

  return result.rows;
};

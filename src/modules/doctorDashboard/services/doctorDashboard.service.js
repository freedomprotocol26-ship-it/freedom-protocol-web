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

/**
 * Create New Patient (Doctor-owned)
 */
exports.createPatient = async (doctorId, patientData) => {
  const { first_name, last_name, email } = patientData;

  const result = await pool.query(
    `INSERT INTO patients (first_name, last_name, email, doctor_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, first_name, last_name, email`,
    [first_name, last_name, email, doctorId]
  );

  return result.rows[0];
};

const db = require('../../../db');

async function getPatientsByDoctorId(doctorId) {
  const query = `
    SELECT *
    FROM patients
    WHERE doctor_id = $1
    ORDER BY created_at DESC
  `;

  const { rows } = await db.query(query, [doctorId]);
  return rows;
}

module.exports = {
  getPatientsByDoctorId,
};

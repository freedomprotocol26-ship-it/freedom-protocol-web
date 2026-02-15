const pool = require('../../../db');

async function approveDoctor(doctorId) {
  const result = await pool.query(
    `
    UPDATE users
    SET approval_status = 'approved'
    WHERE id = $1 AND role = 'doctor'
    RETURNING id, approval_status
    `,
    [doctorId]
  );

  return result.rows[0] || null;
}

module.exports = {
  approveDoctor,
};

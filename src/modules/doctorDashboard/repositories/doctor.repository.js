const pool = require('../../../db');

async function getDoctorApprovalStatus(userId) {
  const result = await pool.query(
    'SELECT approval_status FROM users WHERE id = $1 AND role = $2',
    [userId, 'doctor']
  );

  return result.rows[0] || null;
}

module.exports = {
  getDoctorApprovalStatus,
};

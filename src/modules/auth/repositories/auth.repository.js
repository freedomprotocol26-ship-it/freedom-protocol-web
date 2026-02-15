const pool = require('../../../db');

async function getUserByEmail(email) {
  const result = await pool.query(
    'SELECT id, email, password_hash, role, approval_status FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
}

async function updateDoctorApprovalStatus(userId, status) {
  const result = await pool.query(
    `
    UPDATE users
    SET approval_status = $1
    WHERE id = $2 AND role = 'doctor'
    RETURNING id, approval_status
    `,
    [status, userId]
  );

  return result.rows[0] || null;
}

module.exports = {
  getUserByEmail,
  updateDoctorApprovalStatus,
};

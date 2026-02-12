const db = require('../db');

/**
 * GET ALL USERS
 */
exports.getAllUsers = async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, email, role, approval_status, account_status, created_at
    FROM users
    ORDER BY created_at DESC
  `);

  return res.status(200).json({
    success: true,
    data: rows
  });
};

/**
 * GET USER BY ID
 */
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `
    SELECT id, email, role, approval_status, account_status, created_at
    FROM users
    WHERE id = $1
    `,
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  return res.status(200).json({
    success: true,
    data: rows[0]
  });
};

/**
 * UPDATE USER ACCOUNT STATUS
 */
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { account_status } = req.body;

  if (!['active', 'suspended'].includes(account_status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid account status'
    });
  }

  const { rows } = await db.query(
    `
    UPDATE users
    SET account_status = $1
    WHERE id = $2
    RETURNING id, email, role, account_status
    `,
    [account_status, id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  return res.status(200).json({
    success: true,
    message: `User account status updated to ${account_status}`,
    data: rows[0]
  });
};

/**
 * GET SYSTEM STATS
 */
exports.getSystemStats = async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE role = 'doctor') AS total_doctors,
      COUNT(*) FILTER (WHERE role = 'patient') AS total_patients,
      COUNT(*) AS total_users
    FROM users
  `);

  return res.status(200).json({
    success: true,
    data: rows[0]
  });
};

/**
 * GET AUDIT LOGS (placeholder)
 */
exports.getAuditLogs = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: []
  });
};

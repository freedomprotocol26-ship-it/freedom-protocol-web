const db = require('../db');

/*
|--------------------------------------------------------------------------
| DOCTOR APPROVAL MANAGEMENT
|--------------------------------------------------------------------------
*/

exports.getPendingDoctors = async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, email, approval_status, account_status, created_at
    FROM users
    WHERE role = 'doctor'
    AND approval_status = 'pending'
    ORDER BY created_at DESC
  `);

  return res.status(200).json({
    success: true,
    data: rows
  });
};

exports.updateDoctorApproval = async (req, res) => {
  const { id } = req.params;
  const { approval_status } = req.body;

  if (!['approved', 'rejected'].includes(approval_status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid approval status'
    });
  }

  const { rows } = await db.query(
    `
    UPDATE users
    SET approval_status = $1
    WHERE id = $2
    AND role = 'doctor'
    RETURNING id, email, approval_status
    `,
    [approval_status, id]
  );

  if (rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Doctor not found'
    });
  }

  return res.status(200).json({
    success: true,
    message: `Doctor ${approval_status} successfully`,
    data: rows[0]
  });
};

/*
|--------------------------------------------------------------------------
| USER MANAGEMENT
|--------------------------------------------------------------------------
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

/*
|--------------------------------------------------------------------------
| SYSTEM STATS
|--------------------------------------------------------------------------
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

exports.getAuditLogs = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: []
  });
};

const db = require('../db');

/*
|--------------------------------------------------------------------------
| ADMIN GOVERNANCE - DOCTOR MANAGEMENT
|--------------------------------------------------------------------------
*/

/**
 * GET /admin/doctors
 * Returns all doctors with approval status
 */
exports.getDoctors = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, email, approval_status
      FROM users
      WHERE role = 'doctor'
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors'
    });
  }
};

/**
 * PATCH /admin/doctors/:id/approve
 */
exports.approveDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `
      UPDATE users
      SET approval_status = 'approved'
      WHERE id = $1
      AND role = 'doctor'
      RETURNING id
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Doctor approved'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to approve doctor'
    });
  }
};

/**
 * PATCH /admin/doctors/:id/suspend
 */
exports.suspendDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `
      UPDATE users
      SET approval_status = 'suspended'
      WHERE id = $1
      AND role = 'doctor'
      RETURNING id
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Doctor suspended'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to suspend doctor'
    });
  }
};

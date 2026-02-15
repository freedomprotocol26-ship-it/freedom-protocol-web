const pool = require('../../../db');
const { fetchDoctorPatients } = require('../services/patients.service');

/**
 * GET /patients/me
 */
exports.getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT id, email, role, created_at
      FROM users
      WHERE id = $1 AND role = 'patient'
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      subscription: req.subscription || null,
    });

  } catch (err) {
    next(err);
  }
};


/**
 * GET /doctor/patients
 */
exports.getDoctorPatients = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const patients = await fetchDoctorPatients(doctorId);

    res.json({
      success: true,
      count: patients.length,
      data: patients,
    });

  } catch (err) {
    next(err);
  }
};

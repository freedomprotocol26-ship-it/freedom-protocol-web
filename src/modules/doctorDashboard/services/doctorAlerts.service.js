const pool = require('../../../db');

/**
 * GET ALL ALERTS FOR DOCTOR
 */
exports.getDoctorAlerts = async (doctorId) => {

  const result = await pool.query(
    `
    SELECT 
      da.id,
      da.alert_type,
      da.message,
      da.is_read,
      da.created_at,
      u.email AS patient_email
    FROM doctor_alerts da
    JOIN users u ON u.id = da.patient_id
    WHERE da.doctor_id = $1
    ORDER BY da.created_at DESC
    `,
    [doctorId]
  );

  return result.rows;
};

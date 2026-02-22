const pool = require('../db');

/**
 * ======================================
 * DOCTOR PRIORITY ENGINE (STABLE VERSION)
 * ======================================
 */
exports.getDoctorPriorityList = async (doctorId) => {

  const result = await pool.query(
    `
    SELECT 
      pp.id AS patient_protocol_id,
      u.email AS patient_email,
      pp.current_phase_id,
      pp.started_at,

      COUNT(CASE 
        WHEN vs.metric_type = 'glucose' AND vs.value::numeric > 180 
        THEN 1 END) AS high_glucose_events,

      COUNT(CASE 
        WHEN vs.metric_type = 'glucose' AND vs.value::numeric < 70 
        THEN 1 END) AS low_glucose_events,

      COUNT(sr.id) FILTER (
        WHERE sr.status IN ('pending','under_review')
      ) AS pending_supervisory_reviews

    FROM patient_protocols pp

    JOIN users u 
      ON u.id = pp.patient_id

    LEFT JOIN patient_vitals vs 
      ON vs.protocol_id = pp.id

    LEFT JOIN governance.supervisory_reviews sr 
      ON sr.related_transition_request_id IS NOT NULL

    WHERE pp.doctor_id = $1

    GROUP BY pp.id, u.email, pp.current_phase_id, pp.started_at

    ORDER BY pp.started_at DESC
    `,
    [doctorId]
  );

  return result.rows;
};
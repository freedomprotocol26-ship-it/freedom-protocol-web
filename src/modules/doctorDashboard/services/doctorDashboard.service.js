const pool = require('../../../db');

/**
 * ===============================
 * GLUCOSE UNIT HANDLING
 * ===============================
 */

// Detect if value is mg/dL (legacy) and convert to mmol/L
const normalizeToMmol = (value) => {
  if (value === null || value === undefined) return null;

  const num = Number(value);

  // If value is clearly mg/dL (very large), convert
  if (num > 30) {
    return Number((num / 18).toFixed(2));
  }

  return Number(num.toFixed(2));
};

/**
 * ===============================
 * RISK CLASSIFICATION (mmol/L)
 * ===============================
 *
 * Normal: < 5.6
 * Prediabetes: 5.6 – 6.9
 * Diabetes: 7.0 – 11.0
 * Critical: > 11.0
 */

const classifyGlucoseRisk = (value) => {

  if (value === null || value === undefined) return null;

  const mmol = normalizeToMmol(value);

  if (mmol < 5.6) return 'normal';
  if (mmol >= 5.6 && mmol <= 6.9) return 'prediabetic';
  if (mmol >= 7.0 && mmol <= 11.0) return 'diabetic';
  if (mmol > 11.0) return 'critical';

  return null;
};


/**
 * ===============================
 * CREATE ALERT IF NEEDED
 * ===============================
 */

const createDoctorAlertIfNeeded = async ({
  doctorId,
  protocolId,
  riskLevel
}) => {

  if (!riskLevel || (riskLevel !== 'diabetic' && riskLevel !== 'critical')) {
    return;
  }

  // Prevent duplicate unread alerts
  const existing = await pool.query(
    `
    SELECT 1
    FROM doctor_alerts
    WHERE doctor_id = $1
      AND patient_protocol_id = $2
      AND status = 'unread'
      AND risk_level = $3
    LIMIT 1
    `,
    [doctorId, protocolId, riskLevel]
  );

  if (existing.rows.length > 0) return;

  const message =
    riskLevel === 'critical'
      ? 'Critical glucose levels detected. Immediate review recommended.'
      : 'Diabetic glucose range detected. Monitor closely.';

  await pool.query(
    `
    INSERT INTO doctor_alerts (
      doctor_id,
      patient_protocol_id,
      risk_level,
      message,
      status,
      created_at
    )
    VALUES ($1,$2,$3,$4,'unread',NOW())
    `,
    [doctorId, protocolId, riskLevel, message]
  );
};


/**
 * ===============================
 * GET DOCTOR STATS
 * ===============================
 */

exports.getDoctorStats = async (doctorId) => {

  const client = await pool.connect();

  try {

    const totalPatientsRes = await client.query(
      `
      SELECT COUNT(DISTINCT patient_id) AS total_patients
      FROM patient_protocols
      WHERE doctor_id = $1
      `,
      [doctorId]
    );

    const activeProtocolsRes = await client.query(
      `
      SELECT COUNT(*) AS active_protocols
      FROM patient_protocols
      WHERE doctor_id = $1
        AND status = 'active'
      `,
      [doctorId]
    );

    const pendingTransitionsRes = await client.query(
      `
      SELECT COUNT(*) AS pending_transitions
      FROM phase_transition_requests ptr
      JOIN patient_protocols pp
        ON pp.id = ptr.patient_protocol_id
      WHERE pp.doctor_id = $1
        AND ptr.status = 'pending'
      `,
      [doctorId]
    );

    const unreadAlertsRes = await client.query(
      `
      SELECT COUNT(*) AS unread_alerts
      FROM doctor_alerts
      WHERE doctor_id = $1
        AND status = 'unread'
      `,
      [doctorId]
    );

    return {
      total_patients: Number(totalPatientsRes.rows[0].total_patients),
      active_protocols: Number(activeProtocolsRes.rows[0].active_protocols),
      pending_transitions: Number(pendingTransitionsRes.rows[0].pending_transitions),
      unread_alerts: Number(unreadAlertsRes.rows[0].unread_alerts)
    };

  } finally {
    client.release();
  }
};


/**
 * ===============================
 * GET ALL PATIENTS (WITH RISK + ALERT)
 * ===============================
 */

exports.getDoctorPatients = async (doctorId) => {

  const result = await pool.query(
    `
    SELECT 
      u.id,
      u.email,
      pp.id AS patient_protocol_id,
      pp.status,
      pp.started_at,
      ph.name AS current_phase_name,

      (
        SELECT pv.value
        FROM patient_vitals pv
        WHERE pv.protocol_id = pp.id
          AND pv.metric_type = 'fasting_glucose'
        ORDER BY pv.created_at DESC
        LIMIT 1
      ) AS last_fasting_glucose,

      (
        SELECT pv.created_at
        FROM patient_vitals pv
        WHERE pv.protocol_id = pp.id
          AND pv.metric_type = 'fasting_glucose'
        ORDER BY pv.created_at DESC
        LIMIT 1
      ) AS last_vital_date

    FROM patient_protocols pp
    JOIN users u ON u.id = pp.patient_id
    LEFT JOIN protocol_phases ph ON ph.id = pp.current_phase_id
    WHERE pp.doctor_id = $1
    ORDER BY pp.started_at DESC
    `,
    [doctorId]
  );

  const enriched = [];

  for (const row of result.rows) {

    const mmolValue = normalizeToMmol(row.last_fasting_glucose);
    const riskLevel = classifyGlucoseRisk(row.last_fasting_glucose);

    await createDoctorAlertIfNeeded({
      doctorId,
      protocolId: row.patient_protocol_id,
      riskLevel
    });

    enriched.push({
      ...row,
      last_fasting_glucose: mmolValue,
      risk_level: riskLevel
    });
  }

  return enriched;
};


/**
 * ===============================
 * GET SINGLE PATIENT
 * ===============================
 */

exports.getDoctorPatientById = async (doctorId, patientId) => {

  const result = await pool.query(
    `
    SELECT 
      u.id,
      u.email,
      pp.id AS patient_protocol_id,
      pp.status,
      pp.started_at,
      ph.name AS current_phase_name
    FROM patient_protocols pp
    JOIN users u ON u.id = pp.patient_id
    LEFT JOIN protocol_phases ph ON ph.id = pp.current_phase_id
    WHERE pp.doctor_id = $1
      AND u.id = $2
    `,
    [doctorId, patientId]
  );

  if (result.rows.length === 0) {
    throw new Error('Patient not found or not assigned to this doctor');
  }

  return result.rows[0];
};


/**
 * ===============================
 * SEARCH PATIENTS
 * ===============================
 */

exports.searchDoctorPatients = async (doctorId, query) => {

  const result = await pool.query(
    `
    SELECT 
      u.id,
      u.email,
      pp.id AS patient_protocol_id,
      pp.status,
      ph.name AS current_phase_name
    FROM patient_protocols pp
    JOIN users u ON u.id = pp.patient_id
    LEFT JOIN protocol_phases ph ON ph.id = pp.current_phase_id
    WHERE pp.doctor_id = $1
      AND u.email ILIKE $2
    `,
    [doctorId, `%${query}%`]
  );

  return result.rows;
};

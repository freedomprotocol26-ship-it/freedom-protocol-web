const pool = require('../../../db');

/**
 * ==========================================
 * Get protocols by patient ID
 * ==========================================
 */
exports.getProtocolsByPatientId = async (patientId) => {
  const result = await pool.query(
    `
    SELECT 
      pp.id,
      pp.patient_id,
      pp.protocol_version_id,
      pp.assigned_by,
      pp.assigned_at,
      pp.status,
      pp.current_phase_id,
      pv.version_number,
      pt.id AS template_id,
      pt.name AS template_name
    FROM patient_protocols pp
    JOIN protocol_versions pv ON pv.id = pp.protocol_version_id
    JOIN protocol_templates pt ON pt.id = pv.template_id
    WHERE pp.patient_id = $1
    ORDER BY pp.assigned_at DESC
    `,
    [patientId]
  );

  return result.rows;
};

/**
 * ==========================================
 * Create protocol assignment
 * ==========================================
 */
exports.createAssignment = async ({
  patientId,
  protocolVersionId,
  assignedBy
}) => {
  const result = await pool.query(
    `
    INSERT INTO patient_protocols (
      patient_id,
      protocol_version_id,
      assigned_by
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [patientId, protocolVersionId, assignedBy]
  );

  return result.rows[0];
};

/**
 * ==========================================
 * Get single protocol assignment
 * ==========================================
 */
exports.getById = async (id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM patient_protocols
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
};

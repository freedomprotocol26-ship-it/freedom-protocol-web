const db = require('../../../db');


const getOverridesForPatient = async (patientId) => {
  const query = `
    SELECT 
      id,
      doctor_id,
      patient_id,
      protocol_version_id,
      protocol_phase_id,
      protocol_action_id,
      override_type,
      override_payload,
      reason,
      created_at
    FROM doctor_protocol_overrides
    WHERE patient_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query, [patientId]);
  return rows;
};

const getOverridesForPatientAndVersion = async (patientId, versionId) => {
  const query = `
    SELECT 
      id,
      doctor_id,
      patient_id,
      protocol_version_id,
      protocol_phase_id,
      protocol_action_id,
      override_type,
      override_payload,
      reason,
      created_at
    FROM doctor_protocol_overrides
    WHERE patient_id = $1 AND protocol_version_id = $2
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query, [patientId, versionId]);
  return rows;
};

const createOverride = async ({
  doctor_id,
  patient_id,
  protocol_version_id,
  protocol_phase_id,
  protocol_action_id,
  override_type,
  override_payload,
  reason
}) => {
  const query = `
    INSERT INTO doctor_protocol_overrides (
      doctor_id,
      patient_id,
      protocol_version_id,
      protocol_phase_id,
      protocol_action_id,
      override_type,
      override_payload,
      reason
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING 
      id,
      doctor_id,
      patient_id,
      protocol_version_id,
      protocol_phase_id,
      protocol_action_id,
      override_type,
      override_payload,
      reason,
      created_at
  `;
  const { rows } = await db.query(query, [
    doctor_id,
    patient_id,
    protocol_version_id,
    protocol_phase_id,
    protocol_action_id,
    override_type,
    override_payload,
    reason
  ]);
  return rows[0];
};

module.exports = {
  getOverridesForPatient,
  getOverridesForPatientAndVersion,
  createOverride
};
const db = require('../../../db');

const assignProtocol = async ({ patient_id, protocol_version_id, assigned_by }) => {
  const query = `
    INSERT INTO patient_protocol_assignments (
      patient_id,
      protocol_version_id,
      assigned_by
    )
    VALUES ($1, $2, $3)
    RETURNING
      id,
      patient_id,
      protocol_version_id,
      assigned_by,
      assigned_at
  `;

  const { rows } = await db.query(query, [
    patient_id,
    protocol_version_id,
    assigned_by
  ]);

  return rows[0];
};

const getPatientProtocol = async (patientId) => {
  const query = `
    SELECT
      id,
      patient_id,
      protocol_version_id,
      assigned_by,
      assigned_at
    FROM patient_protocol_assignments
    WHERE patient_id = $1
    ORDER BY assigned_at DESC
    LIMIT 1
  `;

  const { rows } = await db.query(query, [patientId]);
  return rows[0];
};

module.exports = {
  assignProtocol,
  getPatientProtocol
};

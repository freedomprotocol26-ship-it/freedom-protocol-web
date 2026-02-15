const pool = require('../../../db');
const patientProtocolRepository = require('../repositories/patientProtocol.repository');

/**
 * ======================================
 * Assign protocol to patient (Doctor)
 * ======================================
 */
exports.assignProtocolToPatient = async ({
  doctorId,
  patientId,
  protocolVersionId
}) => {

  const patientCheck = await pool.query(
    `
    SELECT id
    FROM patients
    WHERE id = $1 AND doctor_id = $2
    `,
    [patientId, doctorId]
  );

  if (patientCheck.rows.length === 0) {
    throw new Error('Patient not found or not assigned to this doctor');
  }

  const protocolCheck = await pool.query(
    `
    SELECT id
    FROM protocol_versions
    WHERE id = $1
    `,
    [protocolVersionId]
  );

  if (protocolCheck.rows.length === 0) {
    throw new Error('Protocol version not found');
  }

  return patientProtocolRepository.createAssignment({
    patientId,
    protocolVersionId,
    doctorId
  });
};


/**
 * ======================================
 * Get protocols for specific patient (Doctor view)
 * ======================================
 */
exports.getProtocolsForPatient = async ({
  doctorId,
  patientId
}) => {

  const patientCheck = await pool.query(
    `
    SELECT id
    FROM patients
    WHERE id = $1 AND doctor_id = $2
    `,
    [patientId, doctorId]
  );

  if (patientCheck.rows.length === 0) {
    throw new Error('Patient not found or not assigned to this doctor');
  }

  return patientProtocolRepository.getPatientProtocols(patientId);
};


/**
 * ======================================
 * Get protocols for logged-in patient
 * ======================================
 */
exports.getMyProtocols = async (userId) => {
  return patientProtocolRepository.getProtocolsByUserId(userId);
};


/**
 * ======================================
 * START PROTOCOL (Runtime Engine Step 1)
 * ======================================
 */
exports.startProtocol = async (patientProtocolId) => {

  // 1️⃣ Get protocol assignment
  const protocolRes = await pool.query(
    `
    SELECT *
    FROM patient_protocols
    WHERE id = $1
    `,
    [patientProtocolId]
  );

  if (protocolRes.rows.length === 0) {
    throw new Error('Patient protocol not found');
  }

  const protocol = protocolRes.rows[0];

  if (protocol.status !== 'assigned') {
    throw new Error('Protocol already started or completed');
  }

  // 2️⃣ Get first phase
  const firstPhaseRes = await pool.query(
    `
    SELECT id
    FROM protocol_phases
    WHERE version_id = $1
    ORDER BY phase_order ASC
    LIMIT 1
    `,
    [protocol.protocol_version_id]
  );

  if (firstPhaseRes.rows.length === 0) {
    throw new Error('No phases defined for this protocol');
  }

  const firstPhaseId = firstPhaseRes.rows[0].id;

  // 3️⃣ Activate protocol
  const updateRes = await pool.query(
    `
    UPDATE patient_protocols
    SET status = 'in_progress',
        current_phase_id = $1,
        started_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [firstPhaseId, patientProtocolId]
  );

  return updateRes.rows[0];
};

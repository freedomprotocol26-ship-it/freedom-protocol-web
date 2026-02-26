const pool = require('../../../db');

/**
 * Create Telemedicine Consultation
 */
exports.createConsultation = async ({
  doctorId,
  patientId,
  protocolId,
  type,
  scheduledAt
}) => {

  const result = await pool.query(
    `
    INSERT INTO consultations (
      patient_id,
      doctor_id,
      protocol_id,
      type,
      scheduled_at
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `,
    [
      patientId,
      doctorId,
      protocolId,
      type,
      scheduledAt
    ]
  );

  return result.rows[0];
};


/**
 * Start Consultation
 */
exports.startConsultation = async (consultationId, doctorId) => {

  const check = await pool.query(
    `
    SELECT *
    FROM consultations
    WHERE id = $1
      AND doctor_id = $2
    `,
    [consultationId, doctorId]
  );

  if (check.rows.length === 0) {
    throw new Error('Consultation not found');
  }

  const consultation = check.rows[0];

  if (consultation.payment_status !== 'paid') {
    throw new Error('Payment not confirmed');
  }

  const result = await pool.query(
    `
    UPDATE consultations
    SET status = 'in_progress',
        started_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [consultationId]
  );

  return result.rows[0];
};


/**
 * Generate Encounter Draft
 */
exports.generateEncounterDraft = async (consultationId, doctorId) => {

  const consultRes = await pool.query(
    `
    SELECT *
    FROM consultations
    WHERE id = $1
      AND doctor_id = $2
      AND type = 'telemedicine'
      AND payment_status = 'paid'
      AND status = 'in_progress'
    `,
    [consultationId, doctorId]
  );

  if (consultRes.rows.length === 0) {
    throw new Error('Consultation not eligible for AI generation');
  }

  const existingEncounter = await pool.query(
    `
    SELECT *
    FROM encounter_notes
    WHERE consultation_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [consultationId]
  );

  if (existingEncounter.rows.length > 0) {

    const encounter = existingEncounter.rows[0];

    if (encounter.final_approved_note) {
      throw new Error('Encounter already approved. Draft generation locked.');
    }

    return encounter;
  }

  const consultation = consultRes.rows[0];

  const draft = `
Chief Concern:
Protocol follow-up.

Clinical Summary:
Patient is currently in active protocol.

Vitals Summary:
Structured vitals available in system.

Assessment:
Stable.

Plan:
Continue monitoring and adherence.
  `;

  const insert = await pool.query(
    `
    INSERT INTO encounter_notes (
      consultation_id,
      patient_id,
      doctor_id,
      ai_generated_draft
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *
    `,
    [
      consultationId,
      consultation.patient_id,
      doctorId,
      draft
    ]
  );

  return insert.rows[0];
};


/**
 * Approve Encounter
 */
exports.approveEncounter = async (
  consultationId,
  doctorId,
  doctorNotes
) => {

  const consultRes = await pool.query(
    `
    SELECT *
    FROM consultations
    WHERE id = $1
      AND doctor_id = $2
      AND type = 'telemedicine'
      AND status = 'in_progress'
    `,
    [consultationId, doctorId]
  );

  if (consultRes.rows.length === 0) {
    throw new Error('Consultation not eligible for approval');
  }

  const encounterRes = await pool.query(
    `
    SELECT *
    FROM encounter_notes
    WHERE consultation_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [consultationId]
  );

  if (encounterRes.rows.length === 0) {
    throw new Error('No encounter draft found');
  }

  const encounter = encounterRes.rows[0];

  // 🔥 Correct behavior: doctor's edited text becomes final note
  const finalNote = doctorNotes;

  await pool.query(
    `
    UPDATE encounter_notes
    SET final_approved_note = $1,
        approved_by = $2,
        approved_at = NOW(),
        visible_to_patient = TRUE,
        updated_at = NOW()
    WHERE id = $3
    `,
    [
      finalNote,
      doctorId,
      encounter.id
    ]
  );

  await pool.query(
    `
    UPDATE consultations
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = $1
    `,
    [consultationId]
  );

  return { success: true };
};


/**
 * Get consultations for logged-in doctor
 */
exports.getDoctorConsultations = async (doctorId) => {

  const result = await pool.query(
    `
    SELECT
      id,
      patient_id,
      type,
      status,
      payment_status,
      scheduled_at,
      started_at,
      completed_at
    FROM consultations
    WHERE doctor_id = $1
    ORDER BY scheduled_at DESC
    `,
    [doctorId]
  );

  return result.rows;
};


/**
 * Get Consultation By ID (Doctor Ownership Enforced + Latest Encounter)
 */
exports.getConsultationById = async (consultationId, doctorId) => {

  const consultationResult = await pool.query(
    `
    SELECT
      id,
      patient_id,
      doctor_id,
      type,
      status,
      payment_status,
      scheduled_at,
      started_at,
      completed_at
    FROM consultations
    WHERE id = $1
      AND doctor_id = $2
    `,
    [consultationId, doctorId]
  );

  if (consultationResult.rows.length === 0) {
    return null;
  }

  const consultation = consultationResult.rows[0];

  const encounterResult = await pool.query(
    `
    SELECT
      ai_generated_draft,
      final_approved_note
    FROM encounter_notes
    WHERE consultation_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [consultationId]
  );

  if (encounterResult.rows.length > 0) {
    consultation.ai_generated_draft =
      encounterResult.rows[0].ai_generated_draft;
    consultation.final_approved_note =
      encounterResult.rows[0].final_approved_note;
  } else {
    consultation.ai_generated_draft = null;
    consultation.final_approved_note = null;
  }

  return consultation;
};
// TEMP DEBUG — LIST PROTOCOLS
exports.debugListProtocols = async () => {
  const result = await pool.query(`
    SELECT id, name
    FROM protocols
    LIMIT 5
  `);

  return result.rows;
};
/**
 * DEBUG — List Database Tables
 */
exports.debugListTables = async () => {
  const result = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public';
  `);

  return result.rows;
};
/**
 * DEBUG — List Database Tables
 */
exports.debugListTables = async () => {
  const result = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public';
  `);

  return result.rows;
};


/**
 * DEBUG — List Patient Protocols
 */
exports.debugListPatientProtocols = async () => {
  const result = await pool.query(`
    SELECT id, patient_id
    FROM patient_protocols
    LIMIT 5
  `);

  return result.rows;
};
/**
 * DEBUG — Mark Consultation As Paid
 */
exports.debugMarkAsPaid = async (consultationId) => {
  const result = await pool.query(
    `
    UPDATE consultations
    SET payment_status = 'paid'
    WHERE id = $1
    RETURNING *
    `,
    [consultationId]
  );

  return result.rows[0];
};
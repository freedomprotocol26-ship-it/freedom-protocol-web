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
 * Revenue Gated + Duplicate Protected
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

  // 🔎 Check if encounter already exists
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

    // If already approved → block new draft
    if (encounter.final_approved_note) {
      throw new Error('Encounter already approved. Draft generation locked.');
    }

    // If draft exists but not approved → return existing draft
    return encounter;
  }

  // No draft exists → create new one
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

  const finalNote = `
${encounter.ai_generated_draft}

Doctor Notes:
${doctorNotes || 'None'}
  `;

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

const pool = require('../db');

/**
 * ======================================
 * CREATE SECOND OPINION REQUEST
 * ======================================
 */
exports.createSecondOpinionRequest = async ({
  patientProtocolId,
  transitionRequestId = null,
  requestedByUserId,
  requestedByRole,
  primaryDoctorId,
  reviewerDoctorId = null,
  facilityId = null,
  requestReason
}) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Fetch protocol snapshot
    const protocolRes = await client.query(
      `SELECT * FROM patient_protocols WHERE id = $1`,
      [patientProtocolId]
    );

    if (protocolRes.rows.length === 0) {
      throw new Error('Patient protocol not found');
    }

    const protocolSnapshot = protocolRes.rows[0];

    // 2️⃣ Fetch recent vitals snapshot
    const vitalsRes = await client.query(
      `
      SELECT *
      FROM patient_vitals
      WHERE protocol_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [patientProtocolId]
    );

    const vitalsSnapshot = vitalsRes.rows;

    // 3️⃣ Phase snapshot
    const phaseSnapshot = {
      current_phase_id: protocolSnapshot.current_phase_id,
      current_phase_started_at: protocolSnapshot.current_phase_started_at,
      status: protocolSnapshot.status
    };

    // 🔐 SAFELY SERIALIZE JSON
    const protocolJSON = JSON.stringify(protocolSnapshot);
    const vitalsJSON = JSON.stringify(vitalsSnapshot);
    const phaseJSON = JSON.stringify(phaseSnapshot);

    // 4️⃣ Insert request
    const insertRes = await client.query(
      `
      INSERT INTO second_opinion_requests (
        patient_protocol_id,
        related_transition_request_id,
        requested_by_user_id,
        requested_by_role,
        primary_doctor_id,
        reviewer_doctor_id,
        facility_id,
        request_reason,
        protocol_snapshot,
        vitals_snapshot,
        phase_snapshot,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,'pending')
      RETURNING *
      `,
      [
        patientProtocolId,
        transitionRequestId,
        requestedByUserId,
        requestedByRole,
        primaryDoctorId,
        reviewerDoctorId,
        facilityId,
        requestReason,
        protocolJSON,
        vitalsJSON,
        phaseJSON
      ]
    );

    await client.query('COMMIT');

    return insertRes.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


/**
 * ======================================
 * GET PENDING REVIEWS
 * ======================================
 */
exports.getPendingReviewsForDoctor = async (doctorId) => {

  const { rows } = await pool.query(
    `
    SELECT *
    FROM second_opinion_requests
    WHERE reviewer_doctor_id = $1
      AND status IN ('pending','under_review')
    ORDER BY created_at DESC
    `,
    [doctorId]
  );

  return rows;
};


/**
 * ======================================
 * REVIEW SECOND OPINION
 * ======================================
 */
exports.reviewSecondOpinion = async ({
  secondOpinionId,
  reviewerDoctorId,
  decision,
  notes
}) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `
      SELECT *
      FROM second_opinion_requests
      WHERE id = $1
      FOR UPDATE
      `,
      [secondOpinionId]
    );

    if (existingRes.rows.length === 0) {
      throw new Error('Second opinion request not found');
    }

    const record = existingRes.rows[0];

    if (record.reviewer_doctor_id !== reviewerDoctorId) {
      throw new Error('Unauthorized reviewer');
    }

    if (record.status !== 'pending') {
      throw new Error('Review already completed');
    }

    const updateRes = await client.query(
      `
      UPDATE second_opinion_requests
      SET
        status = 'completed',
        reviewer_decision = $1,
        reviewer_notes = $2,
        reviewed_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [decision, notes, secondOpinionId]
    );

    await client.query('COMMIT');

    return updateRes.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
const pool = require('../db');

/**
 * ======================================
 * CREATE SUPERVISORY REVIEW
 * ======================================
 */
exports.createSupervisoryReview = async ({
  patientProtocolId,
  transitionRequestId = null,
  primaryDoctorId,
  reviewReason,
  triggeredBy = 'system'
}) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const protocolRes = await client.query(
      `SELECT * FROM patient_protocols WHERE id = $1`,
      [patientProtocolId]
    );

    if (protocolRes.rows.length === 0) {
      throw new Error('Patient protocol not found');
    }

    const protocolSnapshot = protocolRes.rows[0];

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

    const phaseSnapshot = {
      current_phase_id: protocolSnapshot.current_phase_id,
      current_phase_started_at: protocolSnapshot.current_phase_started_at,
      status: protocolSnapshot.status
    };

    const primaryRes = await client.query(
      `SELECT facility_id FROM public.users WHERE id = $1`,
      [primaryDoctorId]
    );

    if (primaryRes.rows.length === 0) {
      throw new Error('Primary doctor not found');
    }

    const primaryFacilityId = primaryRes.rows[0].facility_id;

    const supervisorRes = await client.query(
      `
      SELECT id
      FROM public.users
      WHERE role = 'supervisory_doctor'
        AND is_active = TRUE
        AND facility_id <> $1
      LIMIT 1
      `,
      [primaryFacilityId]
    );

    if (supervisorRes.rows.length === 0) {
      throw new Error('No eligible supervisory doctor available');
    }

    const supervisoryDoctorId = supervisorRes.rows[0].id;

    const insertRes = await client.query(
      `
      INSERT INTO supervisory_reviews (
        patient_protocol_id,
        related_transition_request_id,
        triggered_by,
        primary_doctor_id,
        supervisory_doctor_id,
        assignment_status,
        status,
        review_reason,
        protocol_snapshot,
        vitals_snapshot,
        phase_snapshot
      )
      VALUES (
        $1,$2,$3,$4,$5,
        'confirmed',
        'under_review',
        $6,
        $7::jsonb,
        $8::jsonb,
        $9::jsonb
      )
      RETURNING *
      `,
      [
        patientProtocolId,
        transitionRequestId,
        triggeredBy,
        primaryDoctorId,
        supervisoryDoctorId,
        reviewReason,
        JSON.stringify(protocolSnapshot),
        JSON.stringify(vitalsSnapshot),
        JSON.stringify(phaseSnapshot)
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
 * GET PENDING REVIEWS FOR SUPERVISOR
 * ======================================
 */
exports.getPendingReviewsForSupervisor = async (supervisorId) => {

  const { rows } = await pool.query(
    `
    SELECT *
    FROM supervisory_reviews
    WHERE supervisory_doctor_id = $1
      AND status IN ('pending','under_review')
    ORDER BY created_at DESC
    `,
    [supervisorId]
  );

  return rows;
};


/**
 * ======================================
 * COMPLETE SUPERVISORY REVIEW
 * ======================================
 */
exports.completeSupervisoryReview = async ({
  reviewId,
  supervisorId,
  decision, // 'approved' or 'rejected'
  notes
}) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const reviewRes = await client.query(
      `
      SELECT *
      FROM supervisory_reviews
      WHERE id = $1
      FOR UPDATE
      `,
      [reviewId]
    );

    if (reviewRes.rows.length === 0) {
      throw new Error('Supervisory review not found');
    }

    const review = reviewRes.rows[0];

    if (review.supervisory_doctor_id !== supervisorId) {
      throw new Error('Unauthorized reviewer');
    }

    if (!['approved', 'rejected'].includes(decision)) {
      throw new Error('Invalid decision');
    }

    if (review.status !== 'under_review') {
      throw new Error('Review already completed');
    }

    await client.query(
      `
      UPDATE supervisory_reviews
      SET status = $1,
          decision_notes = $2,
          reviewed_at = NOW()
      WHERE id = $3
      `,
      [decision, notes, reviewId]
    );

    await client.query('COMMIT');

    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
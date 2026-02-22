const pool = require('../db');

/**
 * ======================================
 * CREATE SUPERVISORY REVIEW
 * ======================================
 */
exports.createSupervisoryReview = async (data) => {

  const {
    relatedTransitionRequestId,
    assignedSupervisorId,
    protocolSnapshot,
    vitalsSnapshot,
    phaseSnapshot
  } = data;

  const result = await pool.query(
    `
    INSERT INTO governance.supervisory_reviews (
      related_transition_request_id,
      assigned_supervisor_id,
      protocol_snapshot,
      vitals_snapshot,
      phase_snapshot,
      status,
      assignment_status,
      created_at
    )
    VALUES ($1,$2,$3,$4,$5,'pending','confirmed',NOW())
    RETURNING *
    `,
    [
      relatedTransitionRequestId,
      assignedSupervisorId,
      protocolSnapshot,
      vitalsSnapshot,
      phaseSnapshot
    ]
  );

  return result.rows[0];
};


/**
 * ======================================
 * LIST SUPERVISORY REVIEWS
 * ======================================
 */
exports.listSupervisorReviews = async (supervisorId) => {

  const result = await pool.query(
    `
    SELECT *
    FROM governance.supervisory_reviews
    WHERE assigned_supervisor_id = $1
      AND status IN ('pending','under_review')
    ORDER BY created_at ASC
    `,
    [supervisorId]
  );

  return result.rows;
};


/**
 * ======================================
 * COMPLETE SUPERVISORY REVIEW
 * ======================================
 */
exports.completeSupervisoryReview = async (
  reviewId,
  supervisorId,
  decision,
  notes
) => {

  const result = await pool.query(
    `
    UPDATE governance.supervisory_reviews
    SET status = 'completed',
        decision = $1,
        notes = $2,
        reviewed_at = NOW()
    WHERE id = $3
      AND assigned_supervisor_id = $4
      AND status IN ('pending','under_review')
    RETURNING *
    `,
    [decision, notes, reviewId, supervisorId]
  );

  if (result.rows.length === 0) {
    throw new Error('Review not found or already completed');
  }

  return result.rows[0];
};
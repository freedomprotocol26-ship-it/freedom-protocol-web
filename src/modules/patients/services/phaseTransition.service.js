const pool = require('../../../db');

/**
 * ======================================
 * LIST PENDING TRANSITIONS (Doctor View)
 * ======================================
 */
exports.listPendingTransitions = async (doctorId) => {

  const result = await pool.query(
    `
    SELECT 
      ptr.id,
      ptr.patient_protocol_id,
      ptr.reason,
      ptr.status,
      ptr.reviewed_by,
      ptr.reviewed_at,
      ptr.created_at,
      ptr.from_phase,
      ptr.to_phase,
      ptr.clinical_insight,
      u.email AS patient_email
    FROM phase_transition_requests ptr
    JOIN patient_protocols pp 
      ON pp.id = ptr.patient_protocol_id
    JOIN users u 
      ON u.id = pp.patient_id
    WHERE ptr.status = 'pending'
      AND pp.doctor_id = $1
    ORDER BY ptr.created_at ASC
    `,
    [doctorId]
  );

  return result.rows;
};


/**
 * ======================================
 * CREATE TRANSITION REQUEST
 * ======================================
 */
exports.requestTransition = async ({
  patientProtocolId,
  toPhaseId,
  reason,
  doctorId
}) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ownership = await client.query(
      `
      SELECT *
      FROM patient_protocols
      WHERE id = $1
        AND doctor_id = $2
      `,
      [patientProtocolId, doctorId]
    );

    if (ownership.rows.length === 0) {
      throw new Error('Access denied');
    }

    const protocol = ownership.rows[0];

    const insertRes = await client.query(
      `
      INSERT INTO phase_transition_requests (
        patient_protocol_id,
        from_phase,
        to_phase,
        reason,
        status,
        created_at
      )
      VALUES ($1,$2,$3,$4,'pending',NOW())
      RETURNING *
      `,
      [
        patientProtocolId,
        protocol.current_phase_id,
        toPhaseId,
        reason
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
 * APPROVE TRANSITION
 * ======================================
 */
exports.approveTransition = async (transitionId, doctorId) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const transitionRes = await client.query(
      `
      SELECT *
      FROM phase_transition_requests
      WHERE id = $1
      FOR UPDATE
      `,
      [transitionId]
    );

    if (transitionRes.rows.length === 0) {
      throw new Error('Transition request not found');
    }

    const transition = transitionRes.rows[0];

    if (transition.status !== 'pending') {
      throw new Error('Transition already processed');
    }

    const ownershipCheck = await client.query(
      `
      SELECT 1
      FROM patient_protocols
      WHERE id = $1
        AND doctor_id = $2
      `,
      [transition.patient_protocol_id, doctorId]
    );

    if (ownershipCheck.rows.length === 0) {
      throw new Error('Access denied');
    }

    /**
     * 🔴 GOVERNANCE BLOCK CHECK (UPDATED)
     */
    const pendingReviewCheck = await client.query(
      `
      SELECT COUNT(*)
      FROM supervisory_reviews
      WHERE related_transition_request_id = $1
        AND status IN ('pending','under_review')
      `,
      [transitionId]
    );

    if (parseInt(pendingReviewCheck.rows[0].count) > 0) {
      throw new Error('Pending supervisory review required.');
    }

    /**
     * Update protocol phase
     */
    await client.query(
      `
      UPDATE patient_protocols
      SET current_phase_id = $1,
          current_phase_started_at = NOW()
      WHERE id = $2
      `,
      [transition.to_phase, transition.patient_protocol_id]
    );

    /**
     * Mark transition approved
     */
    await client.query(
      `
      UPDATE phase_transition_requests
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = NOW()
      WHERE id = $2
      `,
      [doctorId, transitionId]
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


/**
 * ======================================
 * REJECT TRANSITION
 * ======================================
 */
exports.rejectTransition = async (transitionId, doctorId) => {

  const result = await pool.query(
    `
    UPDATE phase_transition_requests ptr
    SET status = 'rejected',
        reviewed_by = $1,
        reviewed_at = NOW()
    FROM patient_protocols pp
    WHERE ptr.id = $2
      AND ptr.patient_protocol_id = pp.id
      AND pp.doctor_id = $1
      AND ptr.status = 'pending'
    RETURNING ptr.*
    `,
    [doctorId, transitionId]
  );

  if (result.rows.length === 0) {
    throw new Error('Transition not found or access denied');
  }

  return { success: true };
};
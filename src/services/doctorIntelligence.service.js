const pool = require('../db');
const supervisoryReviewService = require('./supervisoryReview.service');

/**
 * Calculate weighted priority score
 */
function calculatePriorityScore({
  lastGlucose,
  hasPendingTransition,
  hasPendingSupervisoryReview,
  isStagnant,
  hasRelapse
}) {
  let score = 0;

  if (lastGlucose !== null) {
    if (lastGlucose >= 16) score += 90;      // Severe hyperglycemia
    else if (lastGlucose >= 11) score += 50; // High
    else if (lastGlucose >= 7) score += 25;  // Moderate
  }

  if (hasPendingTransition) score += 20;
  if (hasPendingSupervisoryReview) score += 30;
  if (isStagnant) score += 15;
  if (hasRelapse) score += 40;

  return score;
}

function classifyPriority(score) {
  if (score >= 81) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 21) return 'medium';
  return 'low';
}

/**
 * MAIN PRIORITY ENGINE
 */
exports.getDoctorPriorityList = async (doctorId) => {

  const { rows: protocols } = await pool.query(
    `
    SELECT *
    FROM patient_protocols
    WHERE doctor_id = $1
      AND status = 'active'
    `,
    [doctorId]
  );

  const results = [];

  for (const protocol of protocols) {

    /**
     * 1️⃣ Latest glucose
     */
    const glucoseRes = await pool.query(
      `
      SELECT value
      FROM patient_vitals
      WHERE protocol_id = $1
        AND metric_type = 'fasting_glucose'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [protocol.id]
    );

    const lastGlucose =
      glucoseRes.rows.length > 0
        ? Number(glucoseRes.rows[0].value)
        : null;

    /**
     * 2️⃣ Pending transition
     */
    const pendingTransitionRes = await pool.query(
      `
      SELECT *
      FROM phase_transition_requests
      WHERE patient_protocol_id = $1
        AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [protocol.id]
    );

    const pendingTransition =
      pendingTransitionRes.rows.length > 0
        ? pendingTransitionRes.rows[0]
        : null;

    const hasPendingTransition = !!pendingTransition;

    /**
     * 3️⃣ Pending supervisory review?
     */
    let hasPendingSupervisoryReview = false;

    if (pendingTransition) {
      const pendingReviewRes = await pool.query(
        `
        SELECT 1
        FROM supervisory_reviews
        WHERE related_transition_request_id = $1
          AND status IN ('pending','under_review')
        LIMIT 1
        `,
        [pendingTransition.id]
      );

      hasPendingSupervisoryReview =
        pendingReviewRes.rows.length > 0;
    }

    /**
     * 4️⃣ Stagnation check
     */
    const stagnationRes = await pool.query(
      `
      SELECT EXTRACT(DAY FROM NOW() - current_phase_started_at) AS days
      FROM patient_protocols
      WHERE id = $1
      `,
      [protocol.id]
    );

    let isStagnant = false;

    if (stagnationRes.rows.length > 0) {
      const days = Number(stagnationRes.rows[0].days);
      if (days > 14) isStagnant = true;
    }

    /**
     * 5️⃣ Relapse check
     */
    const relapseRes = await pool.query(
      `
      SELECT 1
      FROM phase_transition_requests
      WHERE patient_protocol_id = $1
        AND reason = 'relapse'
        AND created_at > NOW() - INTERVAL '30 days'
      LIMIT 1
      `,
      [protocol.id]
    );

    const hasRelapse = relapseRes.rows.length > 0;

    /**
     * 6️⃣ Calculate score
     */
    const score = calculatePriorityScore({
      lastGlucose,
      hasPendingTransition,
      hasPendingSupervisoryReview,
      isStagnant,
      hasRelapse
    });

    const level = classifyPriority(score);

    /**
     * 🔴 AUTO ESCALATION (CRITICAL + HAS TRANSITION)
     */
    if (
      level === 'critical' &&
      hasPendingTransition &&
      !hasPendingSupervisoryReview
    ) {
      await supervisoryReviewService.createSupervisoryReview({
        patientProtocolId: protocol.id,
        transitionRequestId: pendingTransition.id,
        primaryDoctorId: doctorId,
        reviewReason: 'Automatic critical priority escalation',
        triggeredBy: 'system'
      });
    }

    results.push({
      patient_protocol_id: protocol.id,
      patient_id: protocol.patient_id,
      last_glucose: lastGlucose,
      priority_score: score,
      priority_level: level
    });
  }

  results.sort((a, b) => b.priority_score - a.priority_score);

  return results;
};
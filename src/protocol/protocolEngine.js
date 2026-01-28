const { pool } = require('../db');

/**
 * Freedom Protocol Engine (Authoritative)
 * ---------------------------------------
 * Single source of truth for protocol state.
 * No AI. No inference. Database only.
 */

async function evaluateProtocol(userId) {
  /**
   * 1️⃣ Check enrollment
   */
  const enrollmentResult = await pool.query(
    `
    SELECT
      current_phase,
      day_in_phase,
      active
    FROM protocol_enrollments
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId]
  );

  // Not enrolled
  if (enrollmentResult.rows.length === 0) {
    return {
      enrolled: false,
      phase: null,
      phaseLabel: 'Not Enrolled',
      dayInPhase: null,
      protocolState: 'Inactive',
      totalViolations: 0,
      lastViolation: 'None',
      consequence: 'None',
      systemDecision: 'Enroll Required',
      notes: 'User has not enrolled in the Freedom Protocol.'
    };
  }

  const enrollment = enrollmentResult.rows[0];

  /**
   * 2️⃣ Fetch violations
   */
  const violationsResult = await pool.query(
    `
    SELECT
      phase,
      day_number,
      severity,
      category,
      description,
      consequence_applied,
      created_at
    FROM protocol_violations
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  const violations = violationsResult.rows;

  /**
   * 3️⃣ Base state
   */
  let protocolState = 'Compliant';
  let systemDecision = 'Continue Phase';

  const severeCount = violations.filter(
    v => v.severity && v.severity.toLowerCase() === 'severe'
  ).length;

  if (severeCount >= 2) {
    protocolState = 'Non-Compliant';
    systemDecision = 'Reset Phase';
  }

  /**
   * 4️⃣ Last violation summary
   */
  const lastViolation =
    violations.length > 0
      ? violations[0].description || violations[0].category || 'Violation recorded'
      : 'None';

  const consequence =
    violations.length > 0
      ? violations[0].consequence_applied || 'Warning Issued'
      : 'None';

  /**
   * 5️⃣ Final snapshot
   */
  return {
    enrolled: true,
    phase: enrollment.current_phase,
    phaseLabel: `Phase ${enrollment.current_phase} — Reversal`,
    dayInPhase: enrollment.day_in_phase,
    protocolState,
    totalViolations: violations.length,
    lastViolation,
    consequence,
    systemDecision,
    notes:
      protocolState === 'Compliant'
        ? 'Stay strict. Maintain protocol discipline.'
        : 'Protocol deviation detected. Correct immediately.'
  };
}

module.exports = {
  evaluateProtocol
};

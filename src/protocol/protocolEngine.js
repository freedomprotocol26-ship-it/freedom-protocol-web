const { pool } = require('../db');

/**
 * Deterministic Freedom Protocol Engine
 * ------------------------------------
 * This engine evaluates protocol status using ONLY persisted data.
 * No assumptions. No AI. No phantom columns.
 */

async function evaluateProtocol(userId) {
  // 1️⃣ Fetch all violations for this user
  const result = await pool.query(
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

  const violations = result.rows;

  // 2️⃣ Default state (new or unenrolled user)
  if (violations.length === 0) {
    return {
      phase: 1,
      phaseLabel: 'Phase 1 — Reversal',
      dayInPhase: 1,
      protocolState: 'Compliant',
      totalViolations: 0,
      lastViolation: 'None',
      consequence: 'None',
      systemDecision: 'Continue Phase',
      notes: 'No violations recorded. Stay compliant.'
    };
  }

  // 3️⃣ Derive current phase and day
  const latest = violations[0];
  const currentPhase = latest.phase || 1;
  const dayInPhase = latest.day_number || 1;

  // 4️⃣ Violation counts
  const totalViolations = violations.length;

  // 5️⃣ Last violation summary
  const lastViolation =
    latest.description ||
    latest.category ||
    'Protocol violation recorded';

  const consequence =
    latest.consequence_applied || 'Warning Issued';

  // 6️⃣ Determine protocol state
  let protocolState = 'Compliant';
  let systemDecision = 'Continue Phase';

  const severeCount = violations.filter(
    v => v.severity && v.severity.toLowerCase() === 'severe'
  ).length;

  if (severeCount >= 2) {
    protocolState = 'Non-Compliant';
    systemDecision = 'Reset Phase';
  }

  // 7️⃣ Return stable protocol snapshot
  return {
    phase: currentPhase,
    phaseLabel: `Phase ${currentPhase} — Reversal`,
    dayInPhase,
    protocolState,
    totalViolations,
    lastViolation,
    consequence,
    systemDecision,
    notes:
      protocolState === 'Compliant'
        ? 'Glucose improving. Stay strict.'
        : 'Protocol deviation detected. Correct immediately.'
  };
}

module.exports = {
  evaluateProtocol
};

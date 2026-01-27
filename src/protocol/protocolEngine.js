/**
 * Freedom Protocol — Central Deterministic Engine
 * This orchestrates:
 * - interpretation
 * - enforcement
 * - violation handling
 * - phase progression
 *
 * NO AI LOGIC LIVES HERE
 */

const interpretProtocol = require('./interpretProtocol');
const enforceProtocol = require('./enforceProtocol');
const { logViolation } = require('./logViolation');
const {
  evaluateViolations,
  evaluatePhaseProgression
} = require('./progressionEngine');

/**
 * Main protocol execution pipeline
 */
async function runProtocol({
  userId,
  userProfile,
  userInput,
  phase,
  stats // { violationCount, daysCompleted, avgFastingGlucose }
}) {
  // 1️⃣ Interpret user input
  const interpretation = interpretProtocol({
    input: userInput,
    phase,
    userProfile
  });

  // 2️⃣ Enforce protocol rules
  const enforcement = enforceProtocol({
    interpretation,
    phase,
    userProfile
  });

  let violationOutcome = null;

  // 3️⃣ If violation occurred → log it
  if (enforcement.violation) {
    await logViolation({
      userId,
      phase,
      severity: enforcement.violation.severity,
      category: enforcement.violation.category,
      description: enforcement.violation.description,
      foodConsumed: enforcement.violation.foods || [],
      glucoseImpact: enforcement.violation.glucoseImpact || null,
      aiResponse: enforcement.message,
      consequenceApplied: 'pending'
    });

    // 4️⃣ Evaluate violation thresholds
    violationOutcome = evaluateViolations({
      userId,
      phase,
      violationCount: stats.violationCount + 1,
      latestViolation: enforcement.violation
    });
  }

  // 5️⃣ Evaluate phase progression (only if no critical reset)
  let progressionOutcome = null;

  if (!violationOutcome || violationOutcome.action !== 'RESTART_PHASE') {
    progressionOutcome = evaluatePhaseProgression({
      phase,
      daysCompleted: stats.daysCompleted,
      avgFastingGlucose: stats.avgFastingGlucose,
      violationCount: stats.violationCount
    });
  }

  // 6️⃣ Final deterministic response
  return {
    allowed: enforcement.allowed,
    message: enforcement.message,
    violation: enforcement.violation || null,

    violationOutcome: violationOutcome || {
      action: 'NONE'
    },

    progressionOutcome: progressionOutcome || {
      canProgress: false
    }
  };
}

module.exports = {
  runProtocol
};

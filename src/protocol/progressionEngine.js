/**
 * Progression Engine
 * Determines phase restart, extension, or progression
 */

const PHASE_RULES = {
  1: {
    maxViolations: 2,
    durationDays: 30,
    restartOnExceed: true
  },
  2: {
    maxViolations: 3,
    durationDays: 30,
    fallbackPhase: 1
  },
  3: {
    maxViolations: 2,
    durationDays: null
  }
};

function evaluateProgression({ phase, stats }) {
  const rules = PHASE_RULES[phase];

  if (!rules) {
    return { action: 'ERROR', reason: 'Invalid phase' };
  }

  // 🔴 Violation enforcement
  if (stats.violationCount > rules.maxViolations) {
    if (phase === 1) {
      return {
        action: 'RESTART_PHASE',
        targetPhase: 1,
        reason: 'Exceeded maximum violations for Phase 1'
      };
    }

    return {
      action: 'FALLBACK_PHASE',
      targetPhase: rules.fallbackPhase || phase,
      reason: 'Exceeded violation limit'
    };
  }

  // ⏳ Duration check
  if (
    rules.durationDays &&
    stats.daysCompleted >= rules.durationDays
  ) {
    return {
      action: 'PROGRESS_PHASE',
      targetPhase: phase + 1,
      reason: 'Phase completed successfully'
    };
  }

  // ✅ Default
  return {
    action: 'STAY_PHASE',
    targetPhase: phase,
    reason: 'Within phase limits'
  };
}

module.exports = {
  evaluateProgression
};

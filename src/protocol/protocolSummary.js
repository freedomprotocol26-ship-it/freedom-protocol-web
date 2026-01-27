/**
 * Freedom Protocol — User-Facing Protocol Summary
 *
 * This module converts enforcement results into a
 * clear, human-readable protocol status for the user.
 *
 * It does NOT enforce rules.
 * It only explains enforcement decisions.
 */

module.exports = function protocolSummary(enforcementResult, userContext) {
  const summary = {
    phase: userContext.currentPhase,
    day: userContext.currentDay,
    allowed: enforcementResult.allowed,
    severity: enforcementResult.severity || null,
    message: '',
    consequence: null
  };

  // BLOCKED ACTIONS
  if (!enforcementResult.allowed) {
    summary.message = enforcementResult.reason;

    switch (enforcementResult.severity) {
      case 'critical':
        summary.consequence =
          'Violation logged. Repeated critical violations may trigger a phase restart.';
        break;

      case 'major':
        summary.consequence =
          'Violation logged. Continued non-compliance may delay progression.';
        break;

      case 'minor':
        summary.consequence =
          'Minor deviation detected. Stay aligned with protocol.';
        break;

      default:
        summary.consequence =
          'Protocol deviation logged.';
    }
  }

  // ALLOWED ACTIONS
  if (enforcementResult.allowed) {
    summary.message = 'This action is compliant with the Freedom Protocol.';
  }

  return summary;
};

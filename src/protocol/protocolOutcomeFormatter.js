/**
 * Formats protocol engine decisions for user-facing feedback
 */

function formatProtocolOutcome({ phase, stats, decision }) {
  let message = `📋 Protocol Status\n`;
  message += `Phase: ${phase}\n`;
  message += `Day: ${stats.daysCompleted}\n`;
  message += `Violations: ${stats.violationCount}/${stats.maxViolations}\n\n`;

  switch (decision.action) {
    case 'RESTART_PHASE':
      message += `🔁 ACTION REQUIRED\n`;
      message += `Your protocol has been restarted to Phase ${decision.targetPhase}.\n`;
      message += `Reason: ${decision.reason}\n`;
      break;

    case 'FALLBACK_PHASE':
      message += `⬅️ PROTOCOL ADJUSTMENT\n`;
      message += `You have been moved back to Phase ${decision.targetPhase}.\n`;
      message += `Reason: ${decision.reason}\n`;
      break;

    case 'PROGRESS_PHASE':
      message += `🎉 CONGRATULATIONS!\n`;
      message += `You have successfully progressed to Phase ${decision.targetPhase}.\n`;
      break;

    case 'STAY_PHASE':
      message += `✅ ON TRACK\n`;
      message += `You remain in Phase ${phase}. Keep going.\n`;
      break;

    default:
      message += `ℹ️ Status unchanged.\n`;
  }

  return message;
}

module.exports = {
  formatProtocolOutcome
};

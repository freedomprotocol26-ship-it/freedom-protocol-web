/**
 * Freedom Protocol — Deterministic Protocol Engine
 *
 * This is the SINGLE source of truth for:
 * - interpreting user input
 * - enforcing protocol rules
 * - logging violations
 * - producing user-safe summaries
 *
 * AI is NOT allowed to make decisions here.
 */

const interpretProtocol = require('./interpretProtocol');
const enforceProtocol = require('./enforceProtocol');
const protocolSummary = require('./protocolSummary');
const logViolation = require('./logViolation');

module.exports = async function protocolEngine({
  userInput,
  userContext,
  db
}) {
  // 1. Interpret user intent
  const interpretation = interpretProtocol(userInput, userContext);

  // 2. Enforce protocol rules
  const enforcement = enforceProtocol(interpretation, userContext);

  // 3. Persist violations (ONLY if blocked)
  if (!enforcement.allowed) {
    await logViolation({
      userId: userContext.userId,
      phase: userContext.currentPhase,
      day: userContext.currentDay,
      severity: enforcement.severity,
      category: enforcement.category,
      description: enforcement.reason,
      db
    });
  }

  // 4. Generate user-facing explanation
  const summary = protocolSummary(enforcement, userContext);

  return {
    interpretation,
    enforcement,
    summary
  };
};

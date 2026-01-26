/**
 * FREEDOM PROTOCOL — INTERPRETER
 * ------------------------------
 * This is the single decision engine.
 * AI is NOT allowed to override this output.
 */

const schema = require("./protocol.schema");
const absoluteRules = require("./absoluteRules");
const safetyRules = require("./safetyRules");
const phaseRules = require("./phaseRules");

/**
 * @param {Object} input
 * @param {number} input.phase
 * @param {string[]} input.foods
 * @param {number|null} input.glucose
 * @param {string} input.context
 */
function interpretProtocol(input) {
  const result = {
    allowed: true,
    severity: null,
    violations: [],
    message: "",
    recommended_action: null,
  };

  /* ─────────────────────────────
     1️⃣ ABSOLUTE RULES (HARD STOP)
     ───────────────────────────── */
  const absoluteCheck = absoluteRules.check(input);
  if (!absoluteCheck.allowed) {
    return {
      allowed: false,
      severity: absoluteCheck.severity,
      violations: [absoluteCheck.rule],
      message: absoluteCheck.message,
      recommended_action: absoluteCheck.recommendation,
    };
  }

  /* ─────────────────────────────
     2️⃣ SAFETY RULES (MEDICAL)
     ───────────────────────────── */
  if (input.glucose !== null) {
    const safetyCheck = safetyRules.check(input.glucose);
    if (!safetyCheck.safe) {
      return {
        allowed: false,
        severity: "critical",
        violations: ["medical_safety"],
        message: safetyCheck.message,
        recommended_action: safetyCheck.action,
      };
    }
  }

  /* ─────────────────────────────
     3️⃣ PHASE RULES (CONTEXTUAL)
     ───────────────────────────── */
  const phaseCheck = phaseRules.check(input.phase, input.foods);
  if (!phaseCheck.allowed) {
    result.allowed = false;
    result.severity = phaseCheck.severity;
    result.violations.push(phaseCheck.rule);
    result.message = phaseCheck.message;
    result.recommended_action = phaseCheck.recommendation;
    return result;
  }

  /* ─────────────────────────────
     ✅ PASSED ALL CHECKS
     ───────────────────────────── */
  result.message = "Protocol compliant";
  return result;
}

module.exports = { interpretProtocol };

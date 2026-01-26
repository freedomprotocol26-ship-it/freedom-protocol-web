/**
 * Freedom Protocol – Safety Rules Engine
 * -------------------------------------
 * CRITICAL MEDICAL SAFEGUARDS
 * These rules CANNOT be overridden by AI, user, or configuration.
 */

const SAFETY_THRESHOLDS = {
  HYPOGLYCEMIA: 4.0,          // mmol/L
  SEVERE_HYPO: 3.0,
  HYPERGLYCEMIA: 15.0,
  SEVERE_HYPER: 20.0
};

/**
 * Check glucose value and determine if emergency action is required
 */
function evaluateGlucoseSafety(glucoseValue) {
  if (glucoseValue == null || isNaN(glucoseValue)) {
    return { status: 'INVALID', message: 'Invalid glucose reading' };
  }

  if (glucoseValue < SAFETY_THRESHOLDS.SEVERE_HYPO) {
    return {
      status: 'CRITICAL',
      risk: 'SEVERE_HYPOGLYCEMIA',
      action: 'IMMEDIATE_CARB_INTAKE_AND_MEDICAL_ATTENTION',
      message:
        'Dangerously low blood sugar detected. Consume fast-acting glucose immediately and seek urgent medical help.'
    };
  }

  if (glucoseValue < SAFETY_THRESHOLDS.HYPOGLYCEMIA) {
    return {
      status: 'WARNING',
      risk: 'HYPOGLYCEMIA',
      action: 'FAST_CARB_AND_RETEST',
      message:
        'Low blood sugar detected. Consume glucose source and retest in 15 minutes.'
    };
  }

  if (glucoseValue >= SAFETY_THRESHOLDS.SEVERE_HYPER) {
    return {
      status: 'CRITICAL',
      risk: 'SEVERE_HYPERGLYCEMIA',
      action: 'URGENT_MEDICAL_ATTENTION',
      message:
        'Dangerously high blood sugar detected. Seek immediate medical care.'
    };
  }

  if (glucoseValue >= SAFETY_THRESHOLDS.HYPERGLYCEMIA) {
    return {
      status: 'WARNING',
      risk: 'HYPERGLYCEMIA',
      action: 'HYDRATION_EXERCISE_MONITOR',
      message:
        'High blood sugar detected. Increase hydration, light activity, and monitor closely.'
    };
  }

  return {
    status: 'SAFE',
    risk: 'NONE',
    action: 'NONE',
    message: 'Glucose level within acceptable range.'
  };
}

/**
 * Medication Safety Guard
 * AI must NEVER advise starting, stopping, or adjusting medication
 */
function checkMedicationAdviceSafety(aiMessage) {
  const forbiddenPatterns = [
    /stop (taking )?(your )?(medication|metformin|insulin)/i,
    /reduce (your )?(dose|dosage)/i,
    /increase (your )?(dose|dosage)/i,
    /you don’t need (medication|metformin|insulin)/i,
    /replace medication with/i
  ];

  const violation = forbiddenPatterns.some(pattern =>
    pattern.test(aiMessage)
  );

  return {
    allowed: !violation,
    violation,
    message: violation
      ? 'AI attempted to give medication advice. This is forbidden.'
      : 'Medication safety check passed.'
  };
}

/**
 * Emergency Override
 * Forces system to suspend normal coaching flow
 */
function requiresEmergencyOverride(glucoseValue) {
  const evaluation = evaluateGlucoseSafety(glucoseValue);

  return evaluation.status === 'CRITICAL';
}

module.exports = {
  SAFETY_THRESHOLDS,
  evaluateGlucoseSafety,
  checkMedicationAdviceSafety,
  requiresEmergencyOverride
};

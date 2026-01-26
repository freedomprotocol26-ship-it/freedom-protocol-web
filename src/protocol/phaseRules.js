/**
 * Freedom Protocol – Phase Rules Engine
 * ------------------------------------
 * Phase-aware enforcement layer.
 * This file NEVER overrides Absolute or Safety Rules.
 */

const { evaluateAbsoluteRules } = require('./absoluteRules');
const { evaluateSafetyRules } = require('./safetyRules');

const PHASE_CONFIG = {
  1: {
    name: 'REVERSAL',
    maxMeals: 2,
    minMeals: 2,
    fastingHours: 18,
    dinnerDeadline: '18:30',
    exerciseMinMinutes: 30,
    glucoseTestsPerDay: 3,
    zeroTolerance: true
  },
  2: {
    name: 'STABILIZATION',
    maxMeals: 2,
    minMeals: 2,
    fastingHours: 17,
    dinnerDeadline: '19:00',
    exerciseMinMinutes: 45,
    glucoseTestsPerDay: 2,
    zeroTolerance: false
  },
  3: {
    name: 'MAINTENANCE',
    maxMeals: 3,
    minMeals: 2,
    fastingHours: 16,
    dinnerDeadline: null,
    exerciseMinMinutes: 45,
    glucoseTestsPerDay: 1,
    zeroTolerance: false
  }
};

function evaluatePhaseRules({ phase, dailyLog, userProfile }) {
  const config = PHASE_CONFIG[phase];

  if (!config) {
    return {
      allowed: false,
      severity: 'CRITICAL',
      message: 'Invalid protocol phase detected'
    };
  }

  /** 1️⃣ ABSOLUTE RULES (cannot be bypassed) */
  const absoluteCheck = evaluateAbsoluteRules({
    phase,
    dailyLog,
    userProfile
  });

  if (!absoluteCheck.allowed) {
    return absoluteCheck;
  }

  /** 2️⃣ SAFETY RULES (medical firewall) */
  const safetyCheck = evaluateSafetyRules({
    phase,
    dailyLog,
    userProfile
  });

  if (!safetyCheck.allowed) {
    return safetyCheck;
  }

  /** 3️⃣ PHASE-SPECIFIC VALIDATION */
  const mealsToday = dailyLog.meals?.length || 0;

  if (mealsToday < config.minMeals || mealsToday > config.maxMeals) {
    return {
      allowed: false,
      severity: 'MAJOR',
      message: `Phase ${phase} requires exactly ${config.minMeals} meals`
    };
  }

  if (
    config.dinnerDeadline &&
    dailyLog.lastMealTime &&
    dailyLog.lastMealTime > config.dinnerDeadline
  ) {
    return {
      allowed: false,
      severity: config.zeroTolerance ? 'CRITICAL' : 'MAJOR',
      message: `Dinner past ${config.dinnerDeadline} is not allowed in Phase ${phase}`
    };
  }

  if (
    dailyLog.exercise &&
    dailyLog.exercise.durationMinutes < config.exerciseMinMinutes
  ) {
    return {
      allowed: false,
      severity: 'MAJOR',
      message: `Minimum exercise for Phase ${phase} is ${config.exerciseMinMinutes} minutes`
    };
  }

  if (
    dailyLog.glucoseReadings?.length < config.glucoseTestsPerDay
  ) {
    return {
      allowed: false,
      severity: 'MINOR',
      message: `Phase ${phase} requires at least ${config.glucoseTestsPerDay} glucose checks per day`
    };
  }

  /** ✅ PASSED ALL CHECKS */
  return {
    allowed: true,
    severity: 'NONE',
    message: 'Phase rules satisfied'
  };
}

module.exports = {
  evaluatePhaseRules,
  PHASE_CONFIG
};

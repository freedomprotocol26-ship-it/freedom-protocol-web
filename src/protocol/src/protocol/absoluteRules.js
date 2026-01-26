/**
 * Freedom Protocol – Absolute Rules
 * These rules are NON-NEGOTIABLE.
 * AI, users, admins cannot override these.
 */

module.exports = {
  RULE_001_PHASE_1_FORBIDDEN_FOODS: {
    id: "RULE_001",
    description: "Phase 1 forbids all starches, sugars, and processed foods",
    phase: [1],
    enforcement: "STRICT",
    forbiddenCategories: [
      "starches",
      "sugars",
      "processed_foods"
    ],
    aiBehavior: {
      must: [
        "Identify violation",
        "Explain health impact",
        "Suggest protocol-compliant alternative",
        "Log violation"
      ],
      exception: null
    }
  },

  RULE_002_MEAL_FREQUENCY: {
    id: "RULE_002",
    description: "Exactly two meals per day required in Phase 1 and 2",
    phase: [1, 2],
    minMeals: 2,
    maxMeals: 2,
    enforcement: "STRICT",
    aiCannotApprove: [
      "Skipping meals",
      "One meal per day",
      "More than two meals"
    ]
  },

  RULE_003_MEAL_TIMING_PHASE_1: {
    id: "RULE_003",
    description: "Dinner must be completed by 6:30 PM in Phase 1",
    phase: [1],
    dinnerDeadline: "18:30",
    toleranceMinutes: 15,
    enforcement: "STRICT",
    aiMust: [
      "Send reminders",
      "Flag late meals",
      "Explain consequences"
    ]
  },

  RULE_004_COFFEE_NOT_A_MEAL: {
    id: "RULE_004",
    description: "Coffee cannot replace a meal",
    enforcement: "ABSOLUTE",
    aiMustReject: [
      "Using coffee as meal replacement",
      "Suppressing hunger with coffee"
    ],
    aiResponse:
      "Coffee is a supplement, not a meal. You must eat proper protocol food."
  },

  RULE_005_EXERCISE_MANDATORY: {
    id: "RULE_005",
    description: "Exercise is mandatory except one rest day per week",
    enforcement: "STRICT",
    minimumDaysPerWeek: 6,
    minimumDurationMinutes: {
      phase1: 30,
      phase2plus: 45
    },
    aiMust: [
      "Track exercise",
      "Send reminders",
      "Flag non-compliance"
    ]
  },

  RULE_006_GLUCOSE_MONITORING: {
    id: "RULE_006",
    description: "Minimum glucose testing requirements per phase",
    enforcement: "STRICT",
    requirements: {
      phase1: 3,
      phase2: 2,
      phase3: 1
    },
    requiredContexts: ["fasting"],
    aiMust: [
      "Prompt for readings",
      "Analyze trends",
      "Alert on dangerous values"
    ]
  },

  RULE_007_VIOLATION_CONSEQUENCES: {
    id: "RULE_007",
    description: "Violations have mandatory consequences",
    enforcement: "STRICT",
    consequences: {
      phase1: {
        maxViolations: 2,
        action: "RESTART_PHASE_1"
      },
      phase2: {
        maxViolations: 3,
        action: "RETURN_TO_PHASE_1"
      }
    }
  },

  RULE_008_MEDICATION_SAFETY: {
    id: "RULE_008",
    description: "AI cannot advise medication changes",
    enforcement: "ABSOLUTE",
    aiCannot: [
      "Stop medication",
      "Change dosage",
      "Override doctor instructions"
    ],
    aiMust: [
      "Recommend doctor consultation",
      "Monitor glucose trends",
      "Warn about hypoglycemia risk"
    ]
  },

  RULE_009_DANGEROUS_GLUCOSE_LEVELS: {
    id: "RULE_009",
    description: "Critical glucose thresholds require immediate action",
    enforcement: "CRITICAL",
    thresholds: {
      hypoglycemia: 4.0,
      severeHyperglycemia: 15.0
    },
    aiMust: [
      "Alert user immediately",
      "Provide emergency guidance",
      "Log incident"
    ]
  },

  RULE_010_CULTURAL_RESPECT: {
    id: "RULE_010",
    description: "AI must respect cultural and religious practices",
    enforcement: "IMPORTANT",
    aiMust: [
      "Offer protocol-compliant alternatives",
      "Respect religious fasting",
      "Provide solutions not shame"
    ],
    aiCannot: [
      "Dismiss cultural practices",
      "Override religious obligations"
    ]
  }
};

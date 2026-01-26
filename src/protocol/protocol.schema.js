/**
 * FREEDOM PROTOCOL — CANONICAL SCHEMA
 * ----------------------------------
 * ⚠️ READ-ONLY FILE
 * This file defines WHAT the protocol is.
 * It does NOT define HOW rules are enforced.
 *
 * - No logic
 * - No conditionals
 * - No imports
 * - No side effects
 *
 * Rules engines must reference this schema.
 */

module.exports = {
  meta: {
    name: "Freedom Protocol",
    schema_version: "1.0.0",
    created_by: "Patrick Dasoberi",
    created_date: "2026-01-27",
    status: "production-ready",
    regions_supported: ["Ghana", "West Africa", "Africa"],
  },

  phases: {
    phase_1: {
      name: "Reversal",
      duration_days: 30,
      meals_per_day: 2,
      fasting_hours: 18,
      dinner_deadline: "18:30",
      strictness: "STRICT",
    },

    phase_2: {
      name: "Stabilization",
      duration_days: 30,
      meals_per_day: 2,
      fasting_hours: 17,
      dinner_deadline: "19:30",
      strictness: "MODERATE",
    },

    phase_3: {
      name: "Maintenance",
      duration_days: 30,
      meals_per_day: [2, 3],
      fasting_hours: [16, 18],
      dinner_deadline: "FLEXIBLE",
      strictness: "FLEXIBLE",
    },
  },

  glucose_thresholds: {
    hypoglycemia: 4.0,
    optimal_fasting_max: 7.0,
    elevated_warning: 10.0,
    severe_hyperglycemia: 15.0,
  },

  violation_levels: {
    critical: {
      severity: 3,
      description: "Direct protocol breach with metabolic risk",
    },
    major: {
      severity: 2,
      description: "Significant deviation affecting outcomes",
    },
    minor: {
      severity: 1,
      description: "Suboptimal but recoverable behavior",
    },
  },

  foods: {
    forbidden: {
      starches: [
        "rice",
        "fufu",
        "banku",
        "kenkey",
        "bread",
        "pasta",
        "noodles",
        "gari",
      ],
      sugars: [
        "sugar",
        "honey",
        "dates",
        "fruit juice",
        "soft drinks",
        "malt drinks",
      ],
      processed: [
        "biscuits",
        "pastries",
        "chips",
        "meat pie",
        "sausage roll",
      ],
    },

    allowed: {
      proteins: [
        "fish",
        "chicken",
        "eggs",
        "goat meat",
      ],
      vegetables: [
        "tomatoes",
        "onions",
        "kontomire",
        "spinach",
        "okra",
        "garden eggs",
        "cabbage",
        "lettuce",
        "cucumber",
      ],
      fats: [
        "palm oil",
        "groundnut oil",
        "coconut oil",
        "avocado",
      ],
    },
  },
};

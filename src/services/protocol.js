/**
 * Protocol Service
 * 
 * Handles all Freedom Protocol business logic:
 * - Day/phase/week calculations
 * - Progress tracking
 * - Milestone detection
 */

/**
 * Calculate protocol progress from start date
 * 
 * @param {Date} startDate - When the user started
 * @returns {Object} Progress info (day, phase, week)
 */
function calculateProgress(startDate) {
  if (!startDate) {
    return {
      day: 0,
      phase: 0,
      week: 0,
      isActive: false
    };
  }
  
  const start = new Date(startDate);
  const today = new Date();
  
  // Reset time components for accurate day calculation
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentDay = diffDays + 1; // Day 1 is the first day
  
  // Calculate phase (1-3)
  let phase;
  if (currentDay <= 30) {
    phase = 1;
  } else if (currentDay <= 60) {
    phase = 2;
  } else {
    phase = 3;
  }
  
  // Calculate week (1-12)
  const week = Math.min(12, Math.ceil(currentDay / 7));
  
  // Check if protocol is complete
  const isComplete = currentDay > 90;
  const isActive = currentDay >= 1 && currentDay <= 90;
  
  return {
    day: Math.min(currentDay, 90),
    phase,
    week,
    isActive,
    isComplete,
    daysRemaining: Math.max(0, 90 - currentDay)
  };
}

/**
 * Get phase details
 */
function getPhaseDetails(phase) {
  const phases = {
    1: {
      name: 'Adapt',
      days: '1-30',
      fasting: '16:8',
      focus: 'Eliminate sugar, establish fasting rhythm, learn the foods',
      goals: [
        'Remove all added sugar',
        'Establish 16:8 fasting pattern',
        'Morning movement most days',
        'Learn approved vs prohibited foods'
      ]
    },
    2: {
      name: 'Intensify',
      days: '31-60',
      fasting: '18:6 + weekly 24h fast',
      focus: 'Deepen fasting, accelerate fat/sugar burning, see results',
      goals: [
        'Transition to 18:6 fasting',
        'Complete at least two 24-hour fasts',
        'See measurable weight/glucose improvement',
        'Handle cravings and social pressure'
      ]
    },
    3: {
      name: 'Lock In',
      days: '61-90',
      fasting: '18:6 or 20:4 + optional extended fasts',
      focus: 'Make this a lifestyle, not a program',
      goals: [
        'Solidify eating identity',
        'Handle real-life situations confidently',
        'Establish sustainable long-term pattern',
        'Prepare for life after the protocol'
      ]
    }
  };
  
  return phases[phase] || null;
}

/**
 * Get week-specific focus
 */
function getWeekFocus(week) {
  const weekFocus = {
    1: { title: 'Detox & Learn', description: 'Introduce fasting, explain foods, prepare for withdrawal symptoms' },
    2: { title: 'Stabilize', description: 'Reinforce fasting window, troubleshoot hunger waves' },
    3: { title: 'Build Confidence', description: 'Meal planning, handle social situations' },
    4: { title: 'Consolidate', description: 'Review Phase 1 progress, prepare for Phase 2' },
    5: { title: 'Transition', description: 'Move to 18:6 fasting window' },
    6: { title: 'First Extended Fast', description: 'Guide through first 24-hour fast' },
    7: { title: 'Plateau Check', description: 'Assess progress, adjust if needed' },
    8: { title: 'Momentum', description: 'Build on progress, prepare for Phase 3' },
    9: { title: 'Identity Shift', description: 'This is who I am now mindset' },
    10: { title: 'Stress Testing', description: 'Travel, holidays, social pressure' },
    11: { title: 'Refinement', description: 'Personalize long-term protocol' },
    12: { title: 'Graduation', description: 'Final measurements, celebrate, plan maintenance' }
  };
  
  return weekFocus[week] || { title: 'Continue', description: 'Keep following the protocol' };
}

/**
 * Check if today is a milestone day
 */
function getMilestone(day) {
  const milestones = {
    1: { type: 'start', title: 'Day 1 - Beginning', message: 'Welcome to the Freedom Protocol!' },
    7: { type: 'week', title: 'Week 1 Complete', message: 'You survived the hardest week!' },
    14: { type: 'week', title: '2 Weeks', message: 'Hunger should be improving now.' },
    21: { type: 'week', title: '3 Weeks', message: 'Habits are forming!' },
    30: { type: 'phase', title: 'Phase 1 Complete!', message: 'Time for measurements. You\'ve adapted!' },
    45: { type: 'check', title: 'Mid-Protocol', message: 'Halfway through Phase 2. How are results?' },
    60: { type: 'phase', title: 'Phase 2 Complete!', message: 'Enter the final phase. You\'re transformed!' },
    75: { type: 'countdown', title: '15 Days Left', message: 'The home stretch!' },
    90: { type: 'graduation', title: 'GRADUATION!', message: 'You completed the Freedom Protocol!' }
  };
  
  return milestones[day] || null;
}

/**
 * Get fasting window times based on phase
 */
function getFastingWindow(phase, eatingWindowStart, eatingWindowEnd) {
  // Default times if not set
  const defaultStart = '12:00';
  const defaultEnd = '20:00';
  
  const start = eatingWindowStart || defaultStart;
  const end = eatingWindowEnd || defaultEnd;
  
  // Calculate fasting hours based on phase
  let fastingHours;
  switch (phase) {
    case 1:
      fastingHours = 16;
      break;
    case 2:
    case 3:
      fastingHours = 18;
      break;
    default:
      fastingHours = 16;
  }
  
  return {
    eatingStart: start,
    eatingEnd: end,
    fastingHours,
    description: `${fastingHours}:${24 - fastingHours} (eat between ${start} and ${end})`
  };
}

/**
 * Check if user should do a 24-hour fast this week
 */
function shouldDoExtendedFast(phase, week) {
  if (phase === 1) return false;
  
  // Phase 2: One 24h fast per week (suggest on week 6+)
  if (phase === 2 && week >= 6) return true;
  
  // Phase 3: Optional extended fasts
  if (phase === 3) return true;
  
  return false;
}

/**
 * Calculate compliance percentage
 */
function calculateCompliance(logs, metric) {
  if (!logs || logs.length === 0) return 0;
  
  let compliant = 0;
  
  for (const log of logs) {
    switch (metric) {
      case 'fasting':
        if (log.fasting_hours && log.fasting_hours >= 16 && !log.broke_fast_early) {
          compliant++;
        }
        break;
      case 'exercise':
        if (log.exercised) {
          compliant++;
        }
        break;
    }
  }
  
  return Math.round((compliant / logs.length) * 100);
}

/**
 * Generate progress summary
 */
function generateProgressSummary(user, logs, measurements) {
  const progress = calculateProgress(user.start_date);
  
  // Get latest measurements vs baseline
  const latestMeasurement = measurements?.[measurements.length - 1] || {};
  
  const summary = {
    day: progress.day,
    phase: progress.phase,
    phaseName: getPhaseDetails(progress.phase)?.name,
    week: progress.week,
    daysRemaining: progress.daysRemaining,
    
    // Compliance (last 7 days)
    recentLogs: logs?.slice(0, 7) || [],
    fastingCompliance: calculateCompliance(logs?.slice(0, 7), 'fasting'),
    exerciseCompliance: calculateCompliance(logs?.slice(0, 7), 'exercise'),
    
    // Changes from baseline
    weightChange: latestMeasurement.weight && user.starting_weight
      ? (latestMeasurement.weight - user.starting_weight).toFixed(1)
      : null,
    waistChange: latestMeasurement.waist && user.starting_waist
      ? (latestMeasurement.waist - user.starting_waist).toFixed(1)
      : null,
    glucoseChange: latestMeasurement.glucose && user.starting_glucose
      ? (latestMeasurement.glucose - user.starting_glucose).toFixed(1)
      : null,
    
    // Current milestone
    milestone: getMilestone(progress.day),
    weekFocus: getWeekFocus(progress.week)
  };
  
  return summary;
}

module.exports = {
  calculateProgress,
  getPhaseDetails,
  getWeekFocus,
  getMilestone,
  getFastingWindow,
  shouldDoExtendedFast,
  calculateCompliance,
  generateProgressSummary
};

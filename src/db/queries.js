/**
 * Database Queries
 * 
 * All database operations are centralized here for easy maintenance.
 * Each function handles one specific operation.
 */

const { query } = require('./index');

// =============================================
// USER QUERIES
// =============================================

/**
 * Get user by phone number
 */
async function getUserByPhone(phone) {
  const result = await query(
    'SELECT * FROM users WHERE phone = $1',
    [phone]
  );
  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Create new user (from onboarding)
 */
async function createUser(userData) {
  const {
    phone,
    name,
    country,
    has_diabetes,
    diabetes_type,
    on_medication,
    medications,
    has_glucometer,
    starting_weight,
    starting_waist,
    starting_glucose,
    wake_time,
    sleep_time,
    eating_window_start,
    eating_window_end,
    exercises_regularly,
    why_starting,
    biggest_challenge
  } = userData;
  
  const result = await query(`
    INSERT INTO users (
      phone, name, country, has_diabetes, diabetes_type,
      on_medication, medications, has_glucometer,
      starting_weight, starting_waist, starting_glucose,
      wake_time, sleep_time, eating_window_start, eating_window_end,
      exercises_regularly, why_starting, biggest_challenge,
      status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, 'pending'
    )
    RETURNING *
  `, [
    phone, name, country || 'Ghana', has_diabetes, diabetes_type,
    on_medication, medications, has_glucometer,
    starting_weight, starting_waist, starting_glucose,
    wake_time || '06:00', sleep_time || '22:00',
    eating_window_start || '12:00', eating_window_end || '20:00',
    exercises_regularly, why_starting, biggest_challenge
  ]);
  
  return result.rows[0];
}

/**
 * Start user's protocol (set start_date and status)
 */
async function startUserProtocol(userId) {
  const result = await query(`
    UPDATE users 
    SET start_date = CURRENT_DATE,
        current_day = 1,
        current_phase = 1,
        current_week = 1,
        status = 'active'
    WHERE id = $1
    RETURNING *
  `, [userId]);
  
  return result.rows[0];
}

/**
 * Update user's protocol progress (called daily)
 */
async function updateUserProgress(userId) {
  // Calculate current day based on start_date
  const result = await query(`
    UPDATE users 
    SET current_day = GREATEST(1, (CURRENT_DATE - start_date) + 1),
        current_week = GREATEST(1, CEIL(((CURRENT_DATE - start_date) + 1)::DECIMAL / 7)),
        current_phase = CASE 
          WHEN (CURRENT_DATE - start_date) + 1 <= 30 THEN 1
          WHEN (CURRENT_DATE - start_date) + 1 <= 60 THEN 2
          ELSE 3
        END,
        status = CASE 
          WHEN (CURRENT_DATE - start_date) + 1 > 90 THEN 'completed'
          ELSE status
        END
    WHERE id = $1 AND status = 'active'
    RETURNING *
  `, [userId]);
  
  return result.rows[0];
}

/**
 * Get all active users (for scheduled messages)
 */
async function getActiveUsers() {
  const result = await query(`
    SELECT * FROM users 
    WHERE status = 'active'
    ORDER BY current_day ASC
  `);
  return result.rows;
}

/**
 * Update user status
 */
async function updateUserStatus(userId, status) {
  const result = await query(`
    UPDATE users SET status = $2 WHERE id = $1 RETURNING *
  `, [userId, status]);
  return result.rows[0];
}

// =============================================
// MESSAGE QUERIES
// =============================================

/**
 * Save a message (inbound or outbound)
 */
async function saveMessage(userId, direction, content, whatsappMessageId = null) {
  const result = await query(`
    INSERT INTO messages (user_id, direction, content, whatsapp_message_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [userId, direction, content, whatsappMessageId]);
  
  return result.rows[0];
}

/**
 * Get recent messages for context (last N messages)
 */
async function getRecentMessages(userId, limit = 10) {
  const result = await query(`
    SELECT direction, content, created_at
    FROM messages
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [userId, limit]);
  
  // Reverse to get chronological order
  return result.rows.reverse();
}

/**
 * Get messages from today
 */
async function getTodayMessages(userId) {
  const result = await query(`
    SELECT direction, content, created_at
    FROM messages
    WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    ORDER BY created_at ASC
  `, [userId]);
  
  return result.rows;
}

// =============================================
// DAILY LOG QUERIES
// =============================================

/**
 * Create or update daily log
 */
async function upsertDailyLog(userId, logData) {
  const {
    log_date,
    protocol_day,
    fasting_start,
    fasting_end,
    fasting_hours,
    broke_fast_early,
    break_reason,
    glucose_reading,
    weight,
    waist,
    exercised,
    exercise_type,
    exercise_duration,
    energy_level,
    hunger_level,
    mood,
    sleep_quality,
    notes,
    foods_eaten
  } = logData;
  
  const result = await query(`
    INSERT INTO daily_logs (
      user_id, log_date, protocol_day,
      fasting_start, fasting_end, fasting_hours,
      broke_fast_early, break_reason,
      glucose_reading, weight, waist,
      exercised, exercise_type, exercise_duration,
      energy_level, hunger_level, mood, sleep_quality,
      notes, foods_eaten
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    ON CONFLICT (user_id, log_date) DO UPDATE SET
      fasting_start = COALESCE(EXCLUDED.fasting_start, daily_logs.fasting_start),
      fasting_end = COALESCE(EXCLUDED.fasting_end, daily_logs.fasting_end),
      fasting_hours = COALESCE(EXCLUDED.fasting_hours, daily_logs.fasting_hours),
      broke_fast_early = COALESCE(EXCLUDED.broke_fast_early, daily_logs.broke_fast_early),
      break_reason = COALESCE(EXCLUDED.break_reason, daily_logs.break_reason),
      glucose_reading = COALESCE(EXCLUDED.glucose_reading, daily_logs.glucose_reading),
      weight = COALESCE(EXCLUDED.weight, daily_logs.weight),
      waist = COALESCE(EXCLUDED.waist, daily_logs.waist),
      exercised = COALESCE(EXCLUDED.exercised, daily_logs.exercised),
      exercise_type = COALESCE(EXCLUDED.exercise_type, daily_logs.exercise_type),
      exercise_duration = COALESCE(EXCLUDED.exercise_duration, daily_logs.exercise_duration),
      energy_level = COALESCE(EXCLUDED.energy_level, daily_logs.energy_level),
      hunger_level = COALESCE(EXCLUDED.hunger_level, daily_logs.hunger_level),
      mood = COALESCE(EXCLUDED.mood, daily_logs.mood),
      sleep_quality = COALESCE(EXCLUDED.sleep_quality, daily_logs.sleep_quality),
      notes = COALESCE(EXCLUDED.notes, daily_logs.notes),
      foods_eaten = COALESCE(EXCLUDED.foods_eaten, daily_logs.foods_eaten)
    RETURNING *
  `, [
    userId, log_date || new Date(), protocol_day,
    fasting_start, fasting_end, fasting_hours,
    broke_fast_early, break_reason,
    glucose_reading, weight, waist,
    exercised, exercise_type, exercise_duration,
    energy_level, hunger_level, mood, sleep_quality,
    notes, foods_eaten
  ]);
  
  return result.rows[0];
}

/**
 * Get user's recent daily logs
 */
async function getRecentLogs(userId, days = 7) {
  const result = await query(`
    SELECT * FROM daily_logs
    WHERE user_id = $1
    ORDER BY log_date DESC
    LIMIT $2
  `, [userId, days]);
  
  return result.rows;
}

/**
 * Get today's log for a user
 */
async function getTodayLog(userId) {
  const result = await query(`
    SELECT * FROM daily_logs
    WHERE user_id = $1 AND log_date = CURRENT_DATE
  `, [userId]);
  
  return result.rows[0] || null;
}

// =============================================
// WEEKLY MEASUREMENT QUERIES
// =============================================

/**
 * Record weekly measurement
 */
async function recordWeeklyMeasurement(userId, measurementData) {
  const user = await getUserById(userId);
  
  const {
    week_number,
    weight,
    waist,
    glucose,
    notes
  } = measurementData;
  
  // Calculate changes from baseline
  const weight_change = weight && user.starting_weight 
    ? weight - user.starting_weight 
    : null;
  const waist_change = waist && user.starting_waist 
    ? waist - user.starting_waist 
    : null;
  const glucose_change = glucose && user.starting_glucose 
    ? glucose - user.starting_glucose 
    : null;
  
  const result = await query(`
    INSERT INTO weekly_measurements (
      user_id, week_number, phase, measurement_date,
      weight, waist, glucose,
      weight_change, waist_change, glucose_change,
      notes
    ) VALUES (
      $1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10
    )
    ON CONFLICT (user_id, week_number) DO UPDATE SET
      weight = EXCLUDED.weight,
      waist = EXCLUDED.waist,
      glucose = EXCLUDED.glucose,
      weight_change = EXCLUDED.weight_change,
      waist_change = EXCLUDED.waist_change,
      glucose_change = EXCLUDED.glucose_change,
      notes = EXCLUDED.notes,
      measurement_date = CURRENT_DATE
    RETURNING *
  `, [
    userId, week_number, user.current_phase,
    weight, waist, glucose,
    weight_change, waist_change, glucose_change,
    notes
  ]);
  
  return result.rows[0];
}

/**
 * Get all weekly measurements for a user
 */
async function getWeeklyMeasurements(userId) {
  const result = await query(`
    SELECT * FROM weekly_measurements
    WHERE user_id = $1
    ORDER BY week_number ASC
  `, [userId]);
  
  return result.rows;
}

// =============================================
// PHASE COMPLETION QUERIES
// =============================================

/**
 * Record phase completion
 */
async function recordPhaseCompletion(userId, phaseData) {
  const {
    phase,
    weight,
    waist,
    glucose,
    days_completed,
    fasting_compliance_percent,
    exercise_compliance_percent,
    notes
  } = phaseData;
  
  const result = await query(`
    INSERT INTO phase_completions (
      user_id, phase, weight, waist, glucose,
      days_completed, fasting_compliance_percent, exercise_compliance_percent,
      notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (user_id, phase) DO UPDATE SET
      weight = EXCLUDED.weight,
      waist = EXCLUDED.waist,
      glucose = EXCLUDED.glucose,
      days_completed = EXCLUDED.days_completed,
      fasting_compliance_percent = EXCLUDED.fasting_compliance_percent,
      exercise_compliance_percent = EXCLUDED.exercise_compliance_percent,
      notes = EXCLUDED.notes,
      completed_at = NOW()
    RETURNING *
  `, [
    userId, phase, weight, waist, glucose,
    days_completed, fasting_compliance_percent, exercise_compliance_percent,
    notes
  ]);
  
  return result.rows[0];
}

// =============================================
// ANALYTICS QUERIES
// =============================================

/**
 * Get user's progress summary
 */
async function getUserProgressSummary(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  
  const logs = await getRecentLogs(userId, 30);
  const measurements = await getWeeklyMeasurements(userId);
  
  // Calculate compliance
  const daysWithLogs = logs.filter(l => l.fasting_hours).length;
  const daysExercised = logs.filter(l => l.exercised).length;
  
  // Latest measurements
  const latestMeasurement = measurements[measurements.length - 1] || {};
  
  return {
    user,
    current_day: user.current_day,
    current_phase: user.current_phase,
    current_week: user.current_week,
    days_logged: daysWithLogs,
    days_exercised: daysExercised,
    latest_weight: latestMeasurement.weight,
    latest_waist: latestMeasurement.waist,
    latest_glucose: latestMeasurement.glucose,
    weight_change: latestMeasurement.weight_change,
    waist_change: latestMeasurement.waist_change,
    glucose_change: latestMeasurement.glucose_change
  };
}

// =============================================
// PAYMENT QUERIES
// =============================================

/**
 * Record a new payment
 */
async function recordPayment(paymentData) {
  const {
    user_id,
    reference,
    amount,
    currency,
    plan,
    status,
    paystack_access_code,
    metadata
  } = paymentData;
  
  const result = await query(`
    INSERT INTO payments (
      user_id, reference, amount, currency, plan, status,
      paystack_access_code, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    user_id, reference, amount, currency || 'GHS', plan || 'basic',
    status || 'pending', paystack_access_code, 
    metadata ? JSON.stringify(metadata) : null
  ]);
  
  return result.rows[0];
}

/**
 * Get payment by reference
 */
async function getPaymentByReference(reference) {
  const result = await query(
    'SELECT * FROM payments WHERE reference = $1',
    [reference]
  );
  return result.rows[0] || null;
}

/**
 * Update payment status
 */
async function updatePaymentStatus(reference, status, additionalData = {}) {
  const { paid_at, channel, paystack_reference } = additionalData;
  
  const result = await query(`
    UPDATE payments SET
      status = $2,
      paid_at = COALESCE($3, paid_at),
      channel = COALESCE($4, channel),
      paystack_reference = COALESCE($5, paystack_reference)
    WHERE reference = $1
    RETURNING *
  `, [reference, status, paid_at, channel, paystack_reference]);
  
  return result.rows[0];
}

/**
 * Get user's payment history
 */
async function getUserPayments(userId) {
  const result = await query(`
    SELECT * FROM payments
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
  
  return result.rows;
}

/**
 * Check if user has active subscription
 */
async function hasActiveSubscription(userId) {
  const result = await query(`
    SELECT 1 FROM users
    WHERE id = $1 
    AND subscription_status = 'active'
    AND subscription_end > NOW()
  `, [userId]);
  
  return result.rows.length > 0;
}

/**
 * Update user subscription status
 */
async function updateSubscriptionStatus(userId, status, plan = null, endDate = null) {
  const result = await query(`
    UPDATE users SET
      subscription_status = $2,
      subscription_plan = COALESCE($3, subscription_plan),
      subscription_end = COALESCE($4, subscription_end)
    WHERE id = $1
    RETURNING *
  `, [userId, status, plan, endDate]);
  
  return result.rows[0];
}

/**
 * Get users with expiring subscriptions (for reminder notifications)
 */
async function getExpiringSubscriptions(daysAhead = 3) {
  const result = await query(`
    SELECT * FROM users
    WHERE subscription_status = 'active'
    AND subscription_end BETWEEN NOW() AND NOW() + INTERVAL '${daysAhead} days'
  `);
  
  return result.rows;
}

module.exports = {
  // Users
  getUserByPhone,
  getUserById,
  createUser,
  startUserProtocol,
  updateUserProgress,
  getActiveUsers,
  updateUserStatus,
  
  // Messages
  saveMessage,
  getRecentMessages,
  getTodayMessages,
  
  // Daily logs
  upsertDailyLog,
  getRecentLogs,
  getTodayLog,
  
  // Weekly measurements
  recordWeeklyMeasurement,
  getWeeklyMeasurements,
  
  // Phase completions
  recordPhaseCompletion,
  
  // Analytics
  getUserProgressSummary,
  
  // Payments
  recordPayment,
  getPaymentByReference,
  updatePaymentStatus,
  getUserPayments,
  hasActiveSubscription,
  updateSubscriptionStatus,
  getExpiringSubscriptions
};

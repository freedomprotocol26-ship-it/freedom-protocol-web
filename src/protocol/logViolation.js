const { pool } = require('../db');

/**
 * Persist a protocol violation to the database
 */
async function logViolation({
  userId,
  phase,
  dayNumber,
  severity,
  category,
  description,
  glucoseBefore = null,
  glucoseAfter = null,
  consequence = 'none'
}) {
  if (!userId || !phase || !dayNumber || !severity || !category || !description) {
    throw new Error('Missing required violation fields');
  }

  const query = `
    INSERT INTO protocol_violations (
      user_id,
      phase,
      day_number,
      severity,
      category,
      description,
      glucose_before,
      glucose_after,
      consequence_applied
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `;

  const values = [
    userId,
    phase,
    dayNumber,
    severity,
    category,
    description,
    glucoseBefore,
    glucoseAfter,
    consequence
  ];

  try {
    await pool.query(query, values);
  } catch (err) {
    console.error('Failed to log protocol violation:', err);
    // Do NOT throw — violations should never crash the app
  }
}

module.exports = {
  logViolation
};

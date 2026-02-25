// src/modules/patients/services/riskEngine.service.js

const pool = require('../../../db');

/**
 * Deterministic Risk Evaluation Engine (mmol/L version)
 *
 * Thresholds aligned to international standards.
 */
async function evaluateRisk(patientId, glucoseReadingId) {
  try {
    // 1️⃣ Latest fasting reading
    const latestFastingResult = await pool.query(
      `
      SELECT value
      FROM glucose_readings
      WHERE patient_id = $1
        AND context = 'fasting'
      ORDER BY reading_time DESC
      LIMIT 1
      `,
      [patientId]
    );

    let latestFasting = null;

    if (latestFastingResult.rows.length > 0) {
      latestFasting = Number(latestFastingResult.rows[0].value);
    }

    // 2️⃣ Last 7 days readings
    const sevenDayResult = await pool.query(
      `
      SELECT value
      FROM glucose_readings
      WHERE patient_id = $1
        AND reading_time >= NOW() - INTERVAL '7 days'
      `,
      [patientId]
    );

    let sevenDayAverage = null;

    if (sevenDayResult.rows.length > 0) {
      const sum = sevenDayResult.rows.reduce(
        (acc, row) => acc + Number(row.value),
        0
      );
      sevenDayAverage = sum / sevenDayResult.rows.length;
    }

    // 3️⃣ Last 3 fasting readings (trend)
    const trendResult = await pool.query(
      `
      SELECT value
      FROM glucose_readings
      WHERE patient_id = $1
        AND context = 'fasting'
      ORDER BY reading_time DESC
      LIMIT 3
      `,
      [patientId]
    );

    let increasingTrend = false;

    if (trendResult.rows.length === 3) {
      const [r1, r2, r3] = trendResult.rows.map(r => Number(r.value));
      if (r3 < r2 && r2 < r1 && r1 >= 8.3) {
        increasingTrend = true;
      }
    }

    // 4️⃣ Determine Risk Level (mmol/L thresholds)
    let riskLevel = null;
    let triggerType = null;
    let triggerValue = null;

    if (latestFasting !== null && latestFasting >= 10.0) {
      riskLevel = 'severe';
      triggerType = 'fasting_threshold';
      triggerValue = latestFasting;
    }
    else if (increasingTrend) {
      riskLevel = 'severe';
      triggerType = 'fasting_trend';
      triggerValue = latestFasting;
    }
    else if (latestFasting !== null && latestFasting >= 8.3) {
      riskLevel = 'moderate';
      triggerType = 'fasting_threshold';
      triggerValue = latestFasting;
    }
    else if (sevenDayAverage !== null && sevenDayAverage >= 7.8) {
      riskLevel = 'moderate';
      triggerType = 'seven_day_average';
      triggerValue = sevenDayAverage;
    }
    else if (latestFasting !== null && latestFasting >= 7.2) {
      riskLevel = 'mild';
      triggerType = 'fasting_threshold';
      triggerValue = latestFasting;
    }

    if (riskLevel) {
      await pool.query(
        `
        INSERT INTO risk_events
        (patient_id, glucose_reading_id, risk_level, trigger_type, trigger_value, resolved, created_at)
        VALUES ($1, $2, $3, $4, $5, false, NOW())
        `,
        [
          patientId,
          glucoseReadingId || null,
          riskLevel,
          triggerType,
          triggerValue
        ]
      );
    }

    return riskLevel;

  } catch (error) {
    console.error('Risk engine error:', error);
    return null;
  }
}

module.exports = {
  evaluateRisk
};
const pool = require('../../../db');
const { generateMessage } = require('../../coaching/services/coaching.service');
const { evaluateRisk } = require('../services/riskEngine.service');

/**
 * ======================================
 * GET PROTOCOL STATUS
 * ======================================
 */
exports.getProtocolStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        pp.current_phase_id,
        pt.name AS phase_name,
        pp.status,
        pp.started_at,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - pp.started_at)) / 86400) AS days_in_phase
      FROM patient_protocols pp
      JOIN patients p ON p.id = pp.patient_id
      JOIN protocol_phases pt ON pt.id = pp.current_phase_id
      WHERE p.user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Protocol not found',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Protocol status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch protocol status',
    });
  }
};


/**
 * ======================================
 * COMPLETE INTAKE / ACTIVATE PROTOCOL
 * ======================================
 */
exports.completeIntake = async (req, res) => {
  try {
    const userId = req.user.id;

    const patientResult = await pool.query(
      `SELECT id FROM patients WHERE user_id = $1`,
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const patientId = patientResult.rows[0].id;

    const phaseResult = await pool.query(
      `SELECT id FROM protocol_phases ORDER BY phase_order ASC LIMIT 1`
    );

    const firstPhaseId = phaseResult.rows[0].id;

    await pool.query(
      `
      INSERT INTO patient_protocols
      (patient_id, current_phase_id, status, started_at)
      VALUES ($1, $2, 'active', NOW())
      ON CONFLICT (patient_id)
      DO UPDATE SET
        current_phase_id = EXCLUDED.current_phase_id,
        status = 'active',
        started_at = NOW()
      `,
      [patientId, firstPhaseId]
    );

    return res.json({
      success: true,
      message: 'Phase 1 activated successfully.',
    });

  } catch (error) {
    console.error('Intake activation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate protocol.',
    });
  }
};


/**
 * ======================================
 * SUBMIT GLUCOSE + OPTIONAL WEIGHT
 * ======================================
 */
exports.submitDailyCheckin = async (req, res) => {
  try {
    const userId = req.user.id;
    let { blood_glucose, weight, context = "random" } = req.body;

    // ✅ Normalize numeric inputs
    blood_glucose = blood_glucose === "" ? null : blood_glucose;
    weight = weight === "" ? null : weight;

    if (blood_glucose !== null && blood_glucose !== undefined) {
      blood_glucose = Number(blood_glucose);
    }

    if (weight !== null && weight !== undefined) {
      weight = Number(weight);
    }

    const patientResult = await pool.query(
      `SELECT id FROM patients WHERE user_id = $1`,
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const patientId = patientResult.rows[0].id;

    let previousGlucose = null;
    let newGlucoseReadingId = null;
    let riskLevel = null;

    // ✅ Insert glucose only if valid number
    if (typeof blood_glucose === 'number' && !isNaN(blood_glucose)) {

      const previousResult = await pool.query(
        `
        SELECT value
        FROM glucose_readings
        WHERE patient_id = $1
        ORDER BY reading_time DESC
        LIMIT 1
        `,
        [patientId]
      );

      if (previousResult.rows.length > 0) {
        previousGlucose = previousResult.rows[0].value;
      }

      const insertResult = await pool.query(
        `
        INSERT INTO glucose_readings
        (patient_id, value, context, reading_time)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
        `,
        [patientId, blood_glucose, context]
      );

      newGlucoseReadingId = insertResult.rows[0].id;

      // 🔥 Evaluate Risk
      riskLevel = await evaluateRisk(patientId, newGlucoseReadingId);
    }

    // ✅ Insert weight only if valid number
    if (typeof weight === 'number' && !isNaN(weight)) {
      await pool.query(
        `
        INSERT INTO weight_logs
        (patient_id, weight, recorded_at)
        VALUES ($1, $2, NOW())
        `,
        [patientId, weight]
      );
    }

    const protocolResult = await pool.query(
      `
      SELECT pp.started_at, pt.name AS phase_name
      FROM patient_protocols pp
      JOIN protocol_phases pt ON pt.id = pp.current_phase_id
      WHERE pp.patient_id = $1
      `,
      [patientId]
    );

    const protocol = protocolResult.rows[0];

    const startedAt = new Date(protocol.started_at);
    const today = new Date();

    const dayNumber =
      Math.floor((today - startedAt) / (1000 * 60 * 60 * 24)) + 1;

    const coachingMessage = generateMessage({
      phaseName: protocol.phase_name,
      dayNumber,
      glucose: blood_glucose,
      previousGlucose,
      weight,
    });

    return res.json({
      success: true,
      message: "Reading recorded successfully.",
      coaching: coachingMessage,
      risk_level: riskLevel || null
    });

  } catch (error) {
    console.error("Check-in error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record reading.",
    });
  }
};


/**
 * ======================================
 * GET LAST 7 DAYS
 * ======================================
 */
exports.getDailyCheckins = async (req, res) => {
  try {
    const userId = req.user.id;

    const patientResult = await pool.query(
      `SELECT id FROM patients WHERE user_id = $1`,
      [userId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const patientId = patientResult.rows[0].id;

    const result = await pool.query(
      `
      SELECT
        DATE(reading_time) AS checkin_date,
        MAX(value) AS blood_glucose
      FROM glucose_readings
      WHERE patient_id = $1
      GROUP BY DATE(reading_time)
      ORDER BY checkin_date DESC
      LIMIT 7
      `,
      [patientId]
    );

    return res.json({
      success: true,
      data: result.rows.reverse(),
    });

  } catch (error) {
    console.error("Fetch check-ins error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch check-ins.",
    });
  }
};
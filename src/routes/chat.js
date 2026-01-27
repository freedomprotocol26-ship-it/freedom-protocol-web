const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const { runProtocol } = require('../protocol/protocolEngine');
const { getProtocolSummary } = require('../protocol/protocolSummary');

/**
 * Auth middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

/**
 * Main protocol-aware chat endpoint
 */
router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // 1️⃣ Load user profile + protocol state
    const userResult = await pool.query(
      `SELECT current_phase, protocol_start_date 
       FROM app_users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const phase = userResult.rows[0].current_phase || 1;

    // 2️⃣ Fetch stats for decision-making
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE severity IN ('critical','major')) AS violations,
         COUNT(DISTINCT date) AS days_completed,
         AVG(glucose_level) FILTER (WHERE context = 'fasting') AS avg_fasting
       FROM protocol_violations
       LEFT JOIN glucose_readings ON glucose_readings.user_id = $1
       WHERE protocol_violations.user_id = $1`,
      [userId]
    );

    const stats = {
      violationCount: parseInt(statsResult.rows[0].violations || 0),
      daysCompleted: parseInt(statsResult.rows[0].days_completed || 0),
      avgFastingGlucose: parseFloat(statsResult.rows[0].avg_fasting || null)
    };

    // 3️⃣ Run deterministic protocol engine
    const outcome = await runProtocol({
      userId,
      userProfile: {}, // can be expanded later
      userInput: message,
      phase,
      stats
    });

    // 4️⃣ Build protocol visibility summary
    const protocolSummary = getProtocolSummary({
      phase,
      stats,
      outcome
    });

    // 5️⃣ Respond to user
    res.json({
      success: true,
      allowed: outcome.allowed,
      message: outcome.message,
      violation: outcome.violation,
      violationOutcome: outcome.violationOutcome,
      progressionOutcome: outcome.progressionOutcome,
      protocolSummary
    });

  } catch (error) {
    console.error('Protocol chat error:', error);
    res.status(500).json({
      error: 'Protocol processing failed',
      details: process.env.NODE_ENV === 'development'
        ? error.message
        : undefined
    });
  }
});

module.exports = router;

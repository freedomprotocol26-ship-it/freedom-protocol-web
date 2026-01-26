const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { pool } = require('../db');
const { generateText } = require('../services/anthropic.service');
const { interpretProtocol } = require('../protocol/interpretProtocol');

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

/* =========================================================
   HELPERS
========================================================= */
async function getUserProfile(userId) {
  const result = await pool.query(
    `SELECT id, name, email, current_phase, protocol_start_date
     FROM app_users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

async function getRecentGlucose(userId) {
  const result = await pool.query(
    `SELECT glucose_level, measured_at, notes
     FROM glucose_readings
     WHERE user_id = $1
     ORDER BY measured_at DESC
     LIMIT 30`,
    [userId]
  );

  return result.rows;
}

/* =========================================================
   MAIN CHAT – PROTOCOL-AWARE RESPONSE
========================================================= */
router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, contextType } = req.body;
    const userId = req.user.userId;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    /* -----------------------------
       LOAD USER + DATA
    ------------------------------ */
    const user = await getUserProfile(userId);
    const glucoseReadings = await getRecentGlucose(userId);

    /* -----------------------------
       PROTOCOL INTERPRETATION
       (THIS IS THE BRAIN)
    ------------------------------ */
    const protocolDecision = interpretProtocol({
      user,
      glucoseReadings,
      userMessage: message,
      contextType: contextType || 'general'
    });

    /*
      protocolDecision example:
      {
        status: 'OK' | 'VIOLATION' | 'DANGER',
        title: 'Late Dinner Detected',
        explanation: 'Dinner after 6:30 PM raises fasting glucose...',
        allowedActions: [...],
        requiredActions: [...],
        tone: 'firm' | 'supportive' | 'urgent'
      }
    */

    /* -----------------------------
       BUILD CLAUDE PROMPT
       (CLAUDE = VOICE, NOT BRAIN)
    ------------------------------ */
    const systemPrompt = `
You are the Freedom Protocol AI Coach.

You MUST follow these rules:
- You do NOT invent medical advice.
- You do NOT override protocol rules.
- You ONLY explain and communicate the decision provided.
- You do NOT soften or remove restrictions.
- You use a ${protocolDecision.tone} but compassionate tone.

Protocol Decision:
Title: ${protocolDecision.title}
Status: ${protocolDecision.status}

Explanation:
${protocolDecision.explanation}

Required Actions:
${protocolDecision.requiredActions?.join('\n') || 'None'}

Allowed Actions:
${protocolDecision.allowedActions?.join('\n') || 'None'}

Your task:
- Explain this clearly to the user
- Encourage adherence
- Do NOT add new advice
- Do NOT contradict the protocol
`;

    const aiText = await generateText({
      system: systemPrompt,
      user: message,
      maxTokens: 600
    });

    /* -----------------------------
       SAVE CONVERSATION
    ------------------------------ */
    await pool.query(
      `INSERT INTO conversations
       (user_id, user_message, ai_response, protocol_status, created_at, needs_review)
       VALUES ($1, $2, $3, $4, NOW(), true)`,
      [
        userId,
        message,
        aiText,
        protocolDecision.status
      ]
    );

    res.json({
      success: true,
      status: protocolDecision.status,
      response: aiText
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Please try again later'
    });
  }
});

/* =========================================================
   CHAT HISTORY
========================================================= */
router.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_message, ai_response, protocol_status, created_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.userId]
    );

    res.json({ success: true, history: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');

const { pool } = require('../db');
const interpretProtocol = require('../protocol/interpretProtocol');
const logViolation = require('../protocol/logViolation');
const { enforceProtocol } = require('../protocol/enforceProtocol');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/* ======================================================
   AUTH MIDDLEWARE
====================================================== */
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

/* ======================================================
   HELPERS
====================================================== */
async function getUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT id, name, created_at FROM app_users WHERE id = $1`,
    [userId]
  );
  return rows[0];
}

async function getRecentGlucose(userId) {
  const { rows } = await pool.query(
    `SELECT glucose_level, measured_at 
     FROM glucose_readings 
     WHERE user_id = $1 
     ORDER BY measured_at DESC 
     LIMIT 10`,
    [userId]
  );
  return rows;
}

/* ======================================================
   MAIN CHAT ENDPOINT (PROTOCOL-FIRST)
====================================================== */
router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const user = await getUserProfile(userId);
    const glucoseReadings = await getRecentGlucose(userId);

    /* ----------------------------------------------
       STEP 1: INTERPRET MESSAGE THROUGH PROTOCOL
    ---------------------------------------------- */
    const protocolResult = interpretProtocol({
      userId,
      message,
      glucoseReadings,
      context
    });
// ─────────────────────────────
// ENFORCEMENT CHECK (HARD STOP)
// ─────────────────────────────
const enforcement = await enforceProtocol({
  userId: req.user.userId,
  phase: protocolResult.phase,
  phaseStartDate: protocolResult.phaseStartDate
});

if (enforcement.enforced) {
  return res.json({
    success: false,
    enforcement: true,
    action: enforcement.action,
    message: enforcement.message_for_user
  });
}

    /* ----------------------------------------------
       STEP 2: HANDLE VIOLATIONS (NO AI YET)
    ---------------------------------------------- */
    if (protocolResult.violation) {
      await logViolation({
        userId,
        ...protocolResult.violation
      });

      return res.json({
        success: false,
        blocked: true,
        violation: protocolResult.violation,
        response: protocolResult.response
      });
    }

    /* ----------------------------------------------
       STEP 3: SAFETY OVERRIDES
    ---------------------------------------------- */
    if (protocolResult.emergency) {
      return res.json({
        success: false,
        emergency: true,
        response: protocolResult.response
      });
    }

    /* ----------------------------------------------
       STEP 4: CALL CLAUDE (STRICTLY BOUNDED)
    ---------------------------------------------- */
    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `
You are Freedom Protocol AI Coach.

YOU MUST OBEY:
- Absolute rules
- Phase rules
- Medical safety rules

You may NOT:
- Suggest forbidden foods
- Approve violations
- Change medications
- Override protocol rules

If unsure, say: "This is not allowed under the Freedom Protocol."

Tone: firm, supportive, culturally aware.
      `,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });

    const finalText = aiResponse.content[0].text;

    /* ----------------------------------------------
       STEP 5: SAVE CONVERSATION
    ---------------------------------------------- */
    await pool.query(
      `INSERT INTO conversations 
       (user_id, user_message, ai_response, created_at, needs_review)
       VALUES ($1, $2, $3, NOW(), true)`,
      [userId, message, finalText]
    );

    res.json({
      success: true,
      response: finalText
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat processing failed',
      details: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Please try again'
    });
  }
});

/* ======================================================
   HISTORY
====================================================== */
router.get('/api/chat/history', authenticateToken, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT user_message, ai_response, created_at
     FROM conversations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.userId]
  );

  res.json({ success: true, history: rows });
});

module.exports = router;

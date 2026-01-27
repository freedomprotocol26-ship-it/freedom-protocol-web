const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');

const { pool } = require('../db');
const protocolEngine = require('../protocol/protocolEngine');
const { formatProtocolOutcome } = require('../protocol/protocolOutcomeFormatter');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/* ---------------- AUTH ---------------- */

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

/* ---------------- HELPERS ---------------- */

async function getUserContext(userId) {
  const user = await pool.query(
    'SELECT id, name FROM app_users WHERE id = $1',
    [userId]
  );

  const glucose = await pool.query(
    `SELECT glucose_level, measured_at
     FROM glucose_readings
     WHERE user_id = $1
     ORDER BY measured_at DESC
     LIMIT 10`,
    [userId]
  );

  return {
    user: user.rows[0],
    glucose: glucose.rows
  };
}

/* ---------------- CHAT ---------------- */

router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const context = await getUserContext(req.user.userId);

    /* 1️⃣ Run protocol FIRST (deterministic) */
    const protocolResult = await protocolEngine({
      userId: req.user.userId,
      message,
      context
    });

    /* 2️⃣ Ask AI ONLY if allowed */
    let aiResponseText = protocolResult.responseText;

    if (protocolResult.allowAI === true) {
      const aiResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: protocolResult.systemPrompt,
        messages: [
          {
            role: 'user',
            content: protocolResult.aiPrompt
          }
        ]
      });

      aiResponseText = aiResponse.content[0].text;
    }

    /* 3️⃣ Format visible protocol outcome */
    const protocolStatus = formatProtocolOutcome({
      phase: protocolResult.phase,
      stats: protocolResult.stats,
      decision: protocolResult.decision
    });

    const finalResponse = `
${aiResponseText}

${protocolStatus}
`;

    /* 4️⃣ Persist conversation */
    await pool.query(
      `INSERT INTO conversations
       (user_id, user_message, ai_response, created_at, needs_review)
       VALUES ($1, $2, $3, NOW(), true)`,
      [req.user.userId, message, finalResponse]
    );

    res.json({
      success: true,
      reply: finalResponse
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat processing failed',
      details: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Please try again later'
    });
  }
});

/* ---------------- HISTORY ---------------- */

router.get('/api/chat/history', authenticateToken, async (req, res) => {
  const result = await pool.query(
    `SELECT user_message, ai_response, created_at
     FROM conversations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.userId]
  );

  res.json({ success: true, conversations: result.rows });
});

module.exports = router;

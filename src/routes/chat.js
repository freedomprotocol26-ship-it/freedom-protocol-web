const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');

const { pool } = require('../db');
const protocolEngine = require('../protocol/protocolEngine');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/* ===========================
   AUTH MIDDLEWARE
=========================== */
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

/* ===========================
   CHAT ENDPOINT
=========================== */
router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    /* ---------------------------------
       1️⃣ Load user profile
    ---------------------------------- */
    const userResult = await pool.query(
      `SELECT id, name FROM app_users WHERE id = $1`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    /* ---------------------------------
       2️⃣ Run PROTOCOL ENGINE
    ---------------------------------- */
    const protocolDecision = await protocolEngine({
      userId: user.id,
      userMessage: message,
      context
    });

    /**
     * protocolDecision shape:
     * {
     *   allowed: boolean,
     *   severity: 'none' | 'minor' | 'major' | 'critical',
     *   message: string,
     *   userFacingSummary: string,
     *   violationLogged: boolean
     * }
     */

    /* ---------------------------------
       3️⃣ BLOCKED RESPONSE (NO CLAUDE)
    ---------------------------------- */
    if (!protocolDecision.allowed) {
      await pool.query(
        `INSERT INTO conversations
         (user_id, user_message, ai_response, needs_review, created_at)
         VALUES ($1, $2, $3, true, NOW())`,
        [
          user.id,
          message,
          protocolDecision.userFacingSummary
        ]
      );

      return res.json({
        success: true,
        blocked: true,
        response: protocolDecision.userFacingSummary,
        severity: protocolDecision.severity
      });
    }

    /* ---------------------------------
       4️⃣ SAFE CONTEXT FOR CLAUDE
    ---------------------------------- */
    const systemPrompt = `
You are the Freedom Protocol AI Coach.

CRITICAL RULES:
- You do NOT make medical decisions.
- You do NOT approve forbidden foods or behaviors.
- You ONLY explain and reinforce protocol guidance.
- You MUST follow the provided protocol decision.

Protocol Decision Summary:
${protocolDecision.userFacingSummary}

Tone:
- Supportive but firm
- Educational
- Clear
- No shaming
- No flexibility beyond protocol
`;

    /* ---------------------------------
       5️⃣ CALL CLAUDE (EXPLANATION ONLY)
    ---------------------------------- */
    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });

    const finalReply = aiResponse.content[0].text;

    /* ---------------------------------
       6️⃣ SAVE CONVERSATION
    ---------------------------------- */
    await pool.query(
      `INSERT INTO conversations
       (user_id, user_message, ai_response, needs_review, created_at)
       VALUES ($1, $2, $3, true, NOW())`,
      [
        user.id,
        message,
        finalReply
      ]
    );

    /* ---------------------------------
       7️⃣ RETURN RESPONSE
    ---------------------------------- */
    res.json({
      success: true,
      blocked: false,
      response: finalReply
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

/* ===========================
   EXPORT ROUTER
=========================== */
module.exports = router;

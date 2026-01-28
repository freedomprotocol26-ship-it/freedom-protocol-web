const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const protocolEngine = require('../protocol/protocolEngine');

/**
 * Chat endpoint (protocol-aware, deterministic)
 * ---------------------------------------------
 * This endpoint accepts a user message, persists it,
 * and returns protocol-safe feedback.
 */

router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1️⃣ Save user message
    await pool.query(
      `
      INSERT INTO conversations (user_id, user_message, created_at)
      VALUES ($1, $2, NOW())
      `,
      [userId, message]
    );

    // 2️⃣ Evaluate protocol status AFTER message
    const protocolStatus = await protocolEngine.evaluateProtocol(userId);

    // 3️⃣ Deterministic response (NO AI, NO FORMATTERS)
    const responseText =
      protocolStatus.protocolState === 'Non-Compliant'
        ? '⚠️ Protocol deviation detected. Please return to compliance immediately.'
        : '✅ Message recorded. You remain compliant with the protocol.';

    // 4️⃣ Save system response
    await pool.query(
      `
      UPDATE conversations
      SET ai_response = $1
      WHERE user_id = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [responseText, userId]
    );

    res.json({
      success: true,
      reply: responseText,
      protocol: protocolStatus
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat processing failed' });
  }
});

module.exports = router;

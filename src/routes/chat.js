const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const protocolEngine = require('../protocol/protocolEngine');
const { pool } = require('../db');

/**
 * Protocol-aware chat endpoint
 * ----------------------------
 * Deterministic. No legacy formatters. No deleted imports.
 */

router.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Persist message (safe)
    await pool.query(
      `
      INSERT INTO conversations (user_id, user_message, created_at)
      VALUES ($1, $2, NOW())
      `,
      [userId, message]
    );

    // Evaluate protocol AFTER enrollment check
    const protocolStatus = await protocolEngine.evaluateProtocol(userId);

    res.json({
      success: true,
      message: 'Message received',
      protocol: protocolStatus
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat processing failed' });
  }
});

module.exports = router;

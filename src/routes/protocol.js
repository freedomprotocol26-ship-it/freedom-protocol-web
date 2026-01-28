const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authenticateToken');
const protocolEngine = require('../protocol/protocolEngine');

/**
 * GET /api/protocol/status
 * -----------------------
 * Returns deterministic protocol status for the authenticated user
 */
router.get('/api/protocol/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID missing from token'
      });
    }

    const status = await protocolEngine.evaluateProtocol(userId);

    res.json({
      success: true,
      protocol: status
    });
  } catch (err) {
    console.error('Protocol status error:', err);

    res.status(500).json({
      error: 'Unable to load protocol status'
    });
  }
});

module.exports = router;

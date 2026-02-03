const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const requireDoctor = require("../middleware/requireDoctor");
const { completeCareEpisode } = require("../services/revenueService");

const router = express.Router();

/**
 * POST /api/episodes/:id/complete
 * Doctor completes a care episode → ledger is written
 */
router.post(
  "/episodes/:id/complete",
  authenticateToken,
  requireDoctor,
  async (req, res) => {
    try {
      const { id } = req.params;

      await completeCareEpisode({ episodeId: id });

      res.json({ success: true });
    } catch (err) {
      console.error(err.message);
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
);

module.exports = router;

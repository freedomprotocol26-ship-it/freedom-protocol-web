const express = require("express");
const router = express.Router();

const { pool } = require("../db");
const { generatePayoutBatch } = require("../services/payoutService");

/**
 * =========================
 * ADMIN — APPROVE DOCTOR
 * =========================
 */
router.post("/approve-doctor/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      `
      UPDATE doctors
      SET status = 'active'
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to approve doctor",
    });
  }
});

/**
 * =========================
 * ADMIN — RUN PAYOUTS
 * =========================
 */
router.post("/payouts/run", async (req, res) => {
  try {
    const { period_start, period_end } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({
        success: false,
        message: "period_start and period_end are required",
      });
    }

    const result = await generatePayoutBatch({
      periodStart: period_start,
      periodEnd: period_end,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to generate payouts",
    });
  }
});

module.exports = router;


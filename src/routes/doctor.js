const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("../middleware/authenticateToken");

/**
 * Helper: resolve doctor from JWT user_id
 */
async function getDoctorByUserId(userId) {
  const result = await pool.query(
    `
    SELECT id, status, specialty
    FROM doctors
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * GET /api/doctor/dashboard
 */
router.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.sub);

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    const earnings = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total_earnings
      FROM ledger_entries
      WHERE beneficiary_type = 'doctor'
        AND beneficiary_id = $1
      `,
      [doctor.id]
    );

    const consultations = await pool.query(
      `
      SELECT COUNT(*) AS total_consultations
      FROM care_episodes
      WHERE doctor_id = $1
      `,
      [doctor.id]
    );

    res.json({
      success: true,
      doctor,
      stats: {
        total_earnings: earnings.rows[0].total_earnings,
        total_consultations: consultations.rows[0].total_consultations,
      },
    });
  } catch (err) {
    console.error("Doctor dashboard error:", err);
    res.status(500).json({ success: false, message: "Dashboard error" });
  }
});

/**
 * GET /api/doctor/wallet
 */
router.get("/wallet", authenticateToken, async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.sub);

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    // Wallet balance
    const balanceResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM ledger_entries
      WHERE beneficiary_type = 'doctor'
        AND beneficiary_id = $1
      `,
      [doctor.id]
    );

    // Transaction history (ONLY real columns)
    const transactions = await pool.query(
      `
      SELECT
        id,
        care_episode_id,
        amount,
        created_at
      FROM ledger_entries
      WHERE beneficiary_type = 'doctor'
        AND beneficiary_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [doctor.id]
    );

    res.json({
      success: true,
      doctor_id: doctor.id,
      balance: balanceResult.rows[0].balance,
      transactions: transactions.rows,
    });
  } catch (err) {
    console.error("Doctor wallet error:", err);
    res.status(500).json({ success: false, message: "Wallet error" });
  }
});

module.exports = router;

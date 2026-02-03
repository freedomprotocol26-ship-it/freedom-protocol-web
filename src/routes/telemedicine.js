const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const authenticateToken = require("../middleware/authenticateToken");

// Cancel telemedicine appointment
router.post(
  "/telemedicine/:id/cancel",
  authenticateToken,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;
      const userId = req.user.id;
      const role = req.user.role;

      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT * FROM telemedicine_appointments WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (rows.length === 0) {
        throw new Error("Appointment not found");
      }

      const appt = rows[0];

      if (appt.appointment_status !== "scheduled") {
        throw new Error("Cannot cancel after session start");
      }

      let refundPercentage = 0;

      if (role === "patient") {
        const hoursDiff =
          (new Date(appt.scheduled_at) - new Date()) / (1000 * 60 * 60);

        if (hoursDiff >= 24) refundPercentage = 0.8;
        else if (hoursDiff >= 1) refundPercentage = 0.5;
        else refundPercentage = 0;
      }

      if (role === "doctor") refundPercentage = 1.0;
      if (role === "admin") refundPercentage = 1.0;

      const refundAmount = appt.consultation_fee * refundPercentage;

      // Reverse ledger
      if (refundAmount > 0) {
        await client.query(
          `
          INSERT INTO ledger_entries (
            care_episode_id,
            beneficiary_type,
            amount,
            status
          )
          VALUES ($1, 'platform', $2 * -1, 'paid')
        `,
          [appt.care_episode_id, refundAmount]
        );
      }

      await client.query(
        `
        UPDATE telemedicine_appointments
        SET appointment_status = 'cancelled',
            cancelled_by = $1,
            cancelled_at = NOW()
        WHERE id = $2
      `,
        [role, id]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        refund_amount: refundAmount,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(400).json({
        success: false,
        message: err.message,
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;

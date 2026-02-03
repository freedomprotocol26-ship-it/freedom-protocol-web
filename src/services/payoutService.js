const { pool } = require("../db");

async function generatePayoutBatch({ periodStart, periodEnd }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create batch
    const batchRes = await client.query(
      `
      INSERT INTO payout_batches (period_start, period_end, status)
      VALUES ($1, $2, 'processing')
      RETURNING id
      `,
      [periodStart, periodEnd]
    );

    const batchId = batchRes.rows[0].id;

    // 2. Aggregate ledger balances
    const balances = await client.query(
      `
      SELECT
        beneficiary_type,
        beneficiary_id,
        SUM(amount) AS total_amount
      FROM ledger_entries
      WHERE status = 'paid'
        AND beneficiary_type IN ('doctor', 'care_enabler')
        AND created_at BETWEEN $1 AND $2
      GROUP BY beneficiary_type, beneficiary_id
      HAVING SUM(amount) > 0
      `,
      [periodStart, periodEnd]
    );

    // 3. Create payouts
    for (const row of balances.rows) {
      await client.query(
        `
        INSERT INTO payouts (
          beneficiary_type,
          beneficiary_id,
          amount,
          status,
          batch_id
        )
        VALUES ($1, $2, $3, 'pending', $4)
        `,
        [
          row.beneficiary_type === "care_enabler"
            ? "care_enabler"
            : "doctor",
          row.beneficiary_id,
          row.total_amount,
          batchId,
        ]
      );
    }

    // 4. Close batch
    await client.query(
      `
      UPDATE payout_batches
      SET status = 'completed'
      WHERE id = $1
      `,
      [batchId]
    );

    await client.query("COMMIT");
    return { success: true, batchId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  generatePayoutBatch,
};

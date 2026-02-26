const pool = require('../../../db');

/**
 * ======================================
 * RELEASE ELIGIBLE PAYOUTS
 * ======================================
 *
 * This function:
 * 1. Finds payouts where:
 *      - payout_status = 'on_hold'
 *      - hold_until <= NOW()
 * 2. Ensures there is NO open dispute
 * 3. Marks payout as 'released'
 *
 * Federated-safe:
 * - Region-contained
 * - No cross-schema PHI joins
 * - Dispute check local to region
 * - Idempotent
 */

exports.releaseEligiblePayouts = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Lock eligible payouts
    const eligibleRes = await client.query(
      `
      SELECT pl.id,
             pl.payment_id,
             pl.specialist_profile_id,
             pl.payout_amount,
             pl.hold_until,
             c.id AS consultation_id
      FROM marketplace.payout_ledger pl
      JOIN marketplace.payments p
        ON p.id = pl.payment_id
      JOIN marketplace.consultations c
        ON c.id = p.consultation_id
      WHERE pl.payout_status = 'on_hold'
        AND pl.hold_until <= NOW()
      FOR UPDATE
      `
    );

    if (eligibleRes.rows.length === 0) {
      await client.query('COMMIT');
      return { released: 0 };
    }

    let releasedCount = 0;

    for (const row of eligibleRes.rows) {

      // 2️⃣ Check for open disputes
      const disputeRes = await client.query(
        `
        SELECT 1
        FROM marketplace.disputes
        WHERE consultation_id = $1
          AND dispute_status IN ('open','under_review')
        LIMIT 1
        `,
        [row.consultation_id]
      );

      if (disputeRes.rows.length > 0) {
        continue; // Skip payout if dispute exists
      }

      // 3️⃣ Mark payout as released
      await client.query(
        `
        UPDATE marketplace.payout_ledger
        SET payout_status = 'released',
            released_at = NOW()
        WHERE id = $1
        `,
        [row.id]
      );

      releasedCount++;
    }

    await client.query('COMMIT');

    return { released: releasedCount };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
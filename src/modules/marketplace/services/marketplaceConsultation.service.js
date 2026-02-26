const pool = require('../../../db');

/**
 * ======================================
 * CONFIRM CONSULTATION PAYMENT
 * ======================================
 *
 * This method:
 * 1. Verifies consultation exists
 * 2. Marks payment as paid
 * 3. Marks consultation as confirmed
 * 4. Creates payout ledger with 7-day hold
 *
 * Federated-safe:
 * - No AI logic here
 * - No cross-region assumptions
 * - No governance coupling
 */
exports.confirmPaymentAndLockConsultation = async (
  consultationId,
  paymentId
) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Lock consultation row
    const consultationRes = await client.query(
      `
      SELECT *
      FROM marketplace.consultations
      WHERE id = $1
      FOR UPDATE
      `,
      [consultationId]
    );

    if (consultationRes.rows.length === 0) {
      throw new Error('Consultation not found');
    }

    const consultation = consultationRes.rows[0];

    if (consultation.payment_status === 'paid') {
      throw new Error('Consultation already paid');
    }

    // 2️⃣ Lock payment row
    const paymentRes = await client.query(
      `
      SELECT *
      FROM marketplace.payments
      WHERE id = $1
        AND consultation_id = $2
      FOR UPDATE
      `,
      [paymentId, consultationId]
    );

    if (paymentRes.rows.length === 0) {
      throw new Error('Payment record not found');
    }

    const payment = paymentRes.rows[0];

    if (payment.payment_status !== 'pending') {
      throw new Error('Payment already processed');
    }

    // 3️⃣ Mark payment as paid
    await client.query(
      `
      UPDATE marketplace.payments
      SET payment_status = 'paid',
          paid_at = NOW()
      WHERE id = $1
      `,
      [paymentId]
    );

    // 4️⃣ Confirm consultation
    await client.query(
      `
      UPDATE marketplace.consultations
      SET payment_status = 'paid',
          booking_status = 'confirmed'
      WHERE id = $1
      `,
      [consultationId]
    );

    // 5️⃣ Calculate 7-day hold
    const holdUntilRes = await client.query(
      `
      SELECT NOW() + INTERVAL '7 days' AS hold_until
      `
    );

    const holdUntil = holdUntilRes.rows[0].hold_until;

    // 6️⃣ Create payout ledger entry
    const payoutAmount = payment.amount - payment.platform_fee;

    await client.query(
      `
      INSERT INTO marketplace.payout_ledger (
        payment_id,
        specialist_profile_id,
        payout_amount,
        hold_until,
        payout_status
      )
      VALUES ($1,$2,$3,$4,'on_hold')
      `,
      [
        paymentId,
        consultation.specialist_profile_id,
        payoutAmount,
        holdUntil
      ]
    );

    await client.query('COMMIT');

    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
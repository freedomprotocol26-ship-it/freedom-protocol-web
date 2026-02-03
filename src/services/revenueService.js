const { pool } = require("../db");

/**
 * Complete a care episode and write ledger entries atomically.
 */
async function completeCareEpisode({ episodeId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock episode row
    const episodeRes = await client.query(
      `
      SELECT id, doctor_id, care_enabler_id, amount_total, status
      FROM care_episodes
      WHERE id = $1
      FOR UPDATE
      `,
      [episodeId]
    );

    if (episodeRes.rows.length === 0) {
      throw new Error("Care episode not found");
    }

    const episode = episodeRes.rows[0];

    if (episode.status !== "pending") {
      throw new Error("Care episode already processed");
    }

    const total = Number(episode.amount_total);

    // Base split
    const platformBase = total * 0.6;
    const doctorShare = total * 0.3;
    const careEnablerShare = total * 0.1;

    // Platform keeps extra 10% if no care_enabler
    const platformFinal =
      episode.care_enabler_id ? platformBase : platformBase + careEnablerShare;

    // Mark episode completed
    await client.query(
      `UPDATE care_episodes SET status = 'completed' WHERE id = $1`,
      [episodeId]
    );

    // Platform ledger
    await client.query(
      `
      INSERT INTO ledger_entries
        (care_episode_id, beneficiary_type, beneficiary_id, amount, status)
      VALUES ($1, 'platform', NULL, $2, 'pending')
      `,
      [episodeId, platformFinal]
    );

    // Doctor ledger
    await client.query(
      `
      INSERT INTO ledger_entries
        (care_episode_id, beneficiary_type, beneficiary_id, amount, status)
      VALUES ($1, 'doctor', $2, $3, 'pending')
      `,
      [episodeId, episode.doctor_id, doctorShare]
    );

    // Care enabler ledger (only if present)
    if (episode.care_enabler_id) {
      await client.query(
        `
        INSERT INTO ledger_entries
          (care_episode_id, beneficiary_type, beneficiary_id, amount, status)
        VALUES ($1, 'care_enabler', $2, $3, 'pending')
        `,
        [episodeId, episode.care_enabler_id, careEnablerShare]
      );
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { completeCareEpisode };

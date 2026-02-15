const pool = require('../../../db');

/**
 * ======================================
 * Start Protocol
 * ======================================
 */
exports.startProtocol = async (protocolId, userId) => {
  // 1️⃣ Verify protocol belongs to patient and is still assigned
  const protocolRes = await pool.query(
    `
    SELECT *
    FROM patient_protocols
    WHERE id = $1
      AND patient_id = $2
      AND status = 'assigned'
    `,
    [protocolId, userId]
  );

  if (protocolRes.rows.length === 0) {
    throw new Error('Protocol not found for this patient');
  }

  // 2️⃣ Get first phase (ordered)
  const phaseRes = await pool.query(
    `
    SELECT *
    FROM protocol_phases
    WHERE version_id = $1
    ORDER BY phase_order ASC
    LIMIT 1
    `,
    [protocolRes.rows[0].protocol_version_id]
  );

  if (phaseRes.rows.length === 0) {
    throw new Error('No phases found for this protocol');
  }

  const firstPhase = phaseRes.rows[0];

  // 3️⃣ Activate protocol
  await pool.query(
    `
    UPDATE patient_protocols
    SET status = 'active',
        current_phase_id = $1,
        started_at = NOW()
    WHERE id = $2
    `,
    [firstPhase.id, protocolId]
  );

  return {
    protocol_id: protocolId,
    current_phase: firstPhase
  };
};


/**
 * ======================================
 * Get Current Phase
 * ======================================
 */
exports.getCurrentPhase = async (protocolId, userId) => {
  const res = await pool.query(
    `
    SELECT 
      pp.id AS protocol_id,
      pp.status,
      pp.current_phase_id,
      ph.id AS phase_id,
      ph.version_id,
      ph.name,
      ph.order_index,
      ph.day_start,
      ph.day_end,
      ph.phase_order
    FROM patient_protocols pp
    JOIN protocol_phases ph
      ON ph.id = pp.current_phase_id
    WHERE pp.id = $1
      AND pp.patient_id = $2
      AND pp.status = 'active'
    `,
    [protocolId, userId]
  );

  if (res.rows.length === 0) {
    throw new Error('Active protocol not found for this patient');
  }

  const row = res.rows[0];

  return {
    protocol_id: row.protocol_id,
    current_phase: {
      id: row.phase_id,
      version_id: row.version_id,
      name: row.name,
      order_index: row.order_index,
      day_start: row.day_start,
      day_end: row.day_end,
      phase_order: row.phase_order
    }
  };
};

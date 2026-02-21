const pool = require('../../../db');

/**
 * ===============================
 * START PROTOCOL
 * ===============================
 */
exports.startProtocol = async (patientProtocolId) => {

  const protocolRes = await pool.query(
    `SELECT * FROM patient_protocols WHERE id = $1`,
    [patientProtocolId]
  );

  if (protocolRes.rows.length === 0) {
    throw new Error('Patient protocol not found');
  }

  const protocol = protocolRes.rows[0];

  if (protocol.status !== 'assigned') {
    throw new Error('Protocol already started or completed');
  }

  const firstPhaseRes = await pool.query(
    `
    SELECT id
    FROM protocol_phases
    WHERE version_id = $1
    ORDER BY phase_order ASC
    LIMIT 1
    `,
    [protocol.protocol_version_id]
  );

  if (firstPhaseRes.rows.length === 0) {
    throw new Error('No phases defined');
  }

  const firstPhaseId = firstPhaseRes.rows[0].id;

  const updateRes = await pool.query(
    `
    UPDATE patient_protocols
    SET status = 'active',
        current_phase_id = $1,
        current_phase_started_at = NOW(),
        started_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [firstPhaseId, patientProtocolId]
  );

  return updateRes.rows[0];
};


/**
 * ===============================
 * SUBMIT DAILY REPORT
 * ===============================
 */
exports.submitDailyReport = async (
  protocolId,
  userId,
  reportText,
  fastingGlucose
) => {

  if (!reportText) {
    throw new Error('Report text is required');
  }

  const protocolRes = await pool.query(
    `
    SELECT id, current_phase_id, started_at
    FROM patient_protocols
    WHERE id = $1
      AND patient_id = $2
      AND status = 'active'
    `,
    [protocolId, userId]
  );

  if (protocolRes.rows.length === 0) {
    throw new Error('Active protocol not found');
  }

  const protocol = protocolRes.rows[0];

  let dayNumber = 1;

  if (protocol.started_at) {
    const diff =
      (new Date() - new Date(protocol.started_at)) /
      (1000 * 60 * 60 * 24);
    dayNumber = Math.floor(diff) + 1;
  }

  if (fastingGlucose !== undefined && fastingGlucose !== null) {
    await pool.query(
      `
      INSERT INTO patient_vitals (
        patient_id,
        protocol_id,
        phase_id,
        day_number,
        metric_type,
        value,
        entered_by,
        entry_source,
        created_at
      )
      VALUES ($1,$2,$3,$4,'fasting_glucose',$5,$6,'self',NOW())
      `,
      [
        userId,
        protocolId,
        protocol.current_phase_id,
        dayNumber,
        fastingGlucose,
        userId
      ]
    );
  }

  await evaluateExitCriteria(protocolId);
  await evaluateRelapseTriggers(protocolId);
  await evaluateStagnation(protocolId);

  return { success: true };
};


/**
 * ===============================
 * INTERNAL HELPERS
 * ===============================
 */

const hasPendingTransition = async (protocolId) => {
  const res = await pool.query(
    `
    SELECT 1
    FROM phase_transition_requests
    WHERE patient_protocol_id = $1
      AND status = 'pending'
    LIMIT 1
    `,
    [protocolId]
  );
  return res.rows.length > 0;
};


/**
 * EXIT CRITERIA
 */
const evaluateExitCriteria = async (protocolId) => {

  if (await hasPendingTransition(protocolId)) return;

  const phaseRes = await pool.query(
    `SELECT current_phase_id FROM patient_protocols WHERE id = $1`,
    [protocolId]
  );

  if (phaseRes.rows.length === 0) return;

  const { current_phase_id } = phaseRes.rows[0];

  const rules = await pool.query(
    `SELECT * FROM protocol_exit_criteria WHERE phase_id = $1`,
    [current_phase_id]
  );

  for (const rule of rules.rows) {

    const vitals = await pool.query(
      `
      SELECT value
      FROM patient_vitals
      WHERE protocol_id = $1
        AND metric_type = $2
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [protocolId, rule.metric_type, rule.required_consecutive_days]
    );

    if (vitals.rows.length < rule.required_consecutive_days) continue;

    const values = vitals.rows.map(v => Number(v.value));

    const passed = values.every(v => {
      switch (rule.operator) {
        case '<': return v < rule.threshold_value;
        case '>': return v > rule.threshold_value;
        case '<=': return v <= rule.threshold_value;
        case '>=': return v >= rule.threshold_value;
        case '=': return v === rule.threshold_value;
        default: return false;
      }
    });

    if (!passed) continue;

    const nextPhase = await pool.query(
      `
      SELECT id
      FROM protocol_phases
      WHERE version_id = (
        SELECT protocol_version_id
        FROM patient_protocols
        WHERE id = $1
      )
        AND phase_order > (
          SELECT phase_order
          FROM protocol_phases
          WHERE id = $2
        )
      ORDER BY phase_order ASC
      LIMIT 1
      `,
      [protocolId, current_phase_id]
    );

    if (nextPhase.rows.length === 0) return;

    const insight = `
Exit criteria satisfied.

Metric: ${rule.metric_type}
Threshold: ${rule.operator} ${rule.threshold_value}
Required consecutive days: ${rule.required_consecutive_days}
`;

    await pool.query(
      `
      INSERT INTO phase_transition_requests (
        patient_protocol_id,
        from_phase,
        to_phase,
        reason,
        clinical_insight,
        status,
        created_at
      )
      VALUES ($1,$2,$3,'Exit criteria satisfied',$4,'pending',NOW())
      `,
      [protocolId, current_phase_id, nextPhase.rows[0].id, insight]
    );
  }
};


/**
 * RELAPSE TRIGGERS
 */
const evaluateRelapseTriggers = async (protocolId) => {

  if (await hasPendingTransition(protocolId)) return;

  const phaseRes = await pool.query(
    `SELECT current_phase_id FROM patient_protocols WHERE id = $1`,
    [protocolId]
  );

  if (phaseRes.rows.length === 0) return;

  const { current_phase_id } = phaseRes.rows[0];

  const triggers = await pool.query(
    `SELECT * FROM protocol_relapse_triggers WHERE phase_id = $1`,
    [current_phase_id]
  );

  for (const trigger of triggers.rows) {

    const vitals = await pool.query(
      `
      SELECT value
      FROM patient_vitals
      WHERE protocol_id = $1
        AND metric_type = $2
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [protocolId, trigger.metric_type, trigger.required_consecutive_days]
    );

    if (vitals.rows.length < trigger.required_consecutive_days) continue;

    const values = vitals.rows.map(v => Number(v.value));

    const triggered = values.every(v => {
      switch (trigger.operator) {
        case '<': return v < trigger.threshold_value;
        case '>': return v > trigger.threshold_value;
        case '<=': return v <= trigger.threshold_value;
        case '>=': return v >= trigger.threshold_value;
        case '=': return v === trigger.threshold_value;
        default: return false;
      }
    });

    if (!triggered) continue;

    const revertPhase = await pool.query(
      `
      SELECT id
      FROM protocol_phases
      WHERE version_id = (
        SELECT protocol_version_id
        FROM patient_protocols
        WHERE id = $1
      )
        AND phase_order = $2
      LIMIT 1
      `,
      [protocolId, trigger.revert_to_phase]
    );

    if (revertPhase.rows.length === 0) return;

    const insight = `
Relapse trigger activated.

Metric: ${trigger.metric_type}
Threshold breached: ${trigger.operator} ${trigger.threshold_value}
Required consecutive days: ${trigger.required_consecutive_days}
`;

    await pool.query(
      `
      INSERT INTO phase_transition_requests (
        patient_protocol_id,
        from_phase,
        to_phase,
        reason,
        clinical_insight,
        status,
        created_at
      )
      VALUES ($1,$2,$3,'Relapse trigger activated',$4,'pending',NOW())
      `,
      [protocolId, current_phase_id, revertPhase.rows[0].id, insight]
    );
  }
};


/**
 * STAGNATION
 */
const evaluateStagnation = async (protocolId) => {

  if (await hasPendingTransition(protocolId)) return;

  const res = await pool.query(
    `
    SELECT current_phase_id,
           current_phase_started_at
    FROM patient_protocols
    WHERE id = $1
    `,
    [protocolId]
  );

  if (res.rows.length === 0) return;

  const { current_phase_id, current_phase_started_at } = res.rows[0];

  if (!current_phase_started_at) return;

  const diffDays =
    (new Date() - new Date(current_phase_started_at)) /
    (1000 * 60 * 60 * 24);

  const MAX_DAYS_IN_PHASE = 14;

  if (diffDays < MAX_DAYS_IN_PHASE) return;

  const insight = `
Stagnation detected.

Patient has remained in current phase for ${Math.floor(diffDays)} days.
Maximum recommended duration: ${MAX_DAYS_IN_PHASE} days.
Clinical review advised.
`;

  await pool.query(
    `
    INSERT INTO phase_transition_requests (
      patient_protocol_id,
      from_phase,
      to_phase,
      reason,
      clinical_insight,
      status,
      created_at
    )
    VALUES ($1,$2,$3,'Stagnation review required',$4,'pending',NOW())
    `,
    [protocolId, current_phase_id, current_phase_id, insight]
  );
};

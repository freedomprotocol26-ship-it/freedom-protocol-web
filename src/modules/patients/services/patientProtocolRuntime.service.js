const pool = require('../../../db');

/**
 * START PROTOCOL
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
    throw new Error('No phases defined for this protocol');
  }

  const firstPhaseId = firstPhaseRes.rows[0].id;

  const updateRes = await pool.query(
    `
    UPDATE patient_protocols
    SET status = 'active',
        current_phase_id = $1,
        started_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [firstPhaseId, patientProtocolId]
  );

  return updateRes.rows[0];
};


/**
 * GET CURRENT PHASE
 */
exports.getCurrentPhase = async (protocolId, userId) => {

  const result = await pool.query(
    `
    SELECT pp.current_phase_id, ph.name, ph.phase_order
    FROM patient_protocols pp
    JOIN protocol_phases ph ON ph.id = pp.current_phase_id
    WHERE pp.id = $1
      AND pp.patient_id = $2
    `,
    [protocolId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Protocol not found');
  }

  return result.rows[0];
};


/**
 * SUBMIT DAILY REPORT
 */
exports.submitDailyReport = async (
  protocolId,
  userId,
  reportText,
  fastingGlucose
) => {

  if (!reportText || typeof reportText !== 'string') {
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
    const startedDate = new Date(protocol.started_at);
    const today = new Date();
    const diffTime = today.getTime() - startedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    dayNumber = diffDays + 1;
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

  return { success: true };
};


/**
 * CHECK IF PENDING TRANSITION EXISTS
 */
async function hasPendingTransition(protocolId) {

  const existing = await pool.query(
    `
    SELECT 1
    FROM phase_transition_requests
    WHERE patient_protocol_id = $1
      AND status = 'pending'
    LIMIT 1
    `,
    [protocolId]
  );

  return existing.rows.length > 0;
}


/**
 * EVALUATE EXIT CRITERIA
 */
async function evaluateExitCriteria(protocolId) {

  if (await hasPendingTransition(protocolId)) return;

  const phaseRes = await pool.query(
    `
    SELECT pp.current_phase_id, pp.id AS patient_protocol_id, ph.phase_order
    FROM patient_protocols pp
    JOIN protocol_phases ph ON ph.id = pp.current_phase_id
    WHERE pp.id = $1
    `,
    [protocolId]
  );

  if (phaseRes.rows.length === 0) return;

  const { current_phase_id, patient_protocol_id, phase_order } = phaseRes.rows[0];

  const rules = await pool.query(
    `
    SELECT *
    FROM protocol_exit_criteria
    WHERE phase_id = $1
    `,
    [current_phase_id]
  );

  if (rules.rows.length === 0) return;

  for (const rule of rules.rows) {

    const vitals = await pool.query(
      `
      SELECT value
      FROM patient_vitals
      WHERE protocol_id = $1
        AND metric_type = $2
      ORDER BY day_number DESC
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

    if (passed) {

      const nextPhase = await pool.query(
        `
        SELECT phase_order
        FROM protocol_phases
        WHERE version_id = (
          SELECT protocol_version_id
          FROM patient_protocols
          WHERE id = $1
        )
          AND phase_order > $2
        ORDER BY phase_order ASC
        LIMIT 1
        `,
        [protocolId, phase_order]
      );

      if (nextPhase.rows.length === 0) return;

      await pool.query(
        `
        INSERT INTO phase_transition_requests (
          patient_protocol_id,
          from_phase,
          to_phase,
          reason
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          patient_protocol_id,
          phase_order,
          nextPhase.rows[0].phase_order,
          'Exit criteria satisfied'
        ]
      );
    }
  }
}


/**
 * EVALUATE RELAPSE TRIGGERS
 */
async function evaluateRelapseTriggers(protocolId) {

  if (await hasPendingTransition(protocolId)) return;

  const phaseRes = await pool.query(
    `
    SELECT pp.current_phase_id, pp.id AS patient_protocol_id
    FROM patient_protocols pp
    WHERE pp.id = $1
    `,
    [protocolId]
  );

  if (phaseRes.rows.length === 0) return;

  const { current_phase_id, patient_protocol_id } = phaseRes.rows[0];

  const triggers = await pool.query(
    `
    SELECT *
    FROM protocol_relapse_triggers
    WHERE phase_id = $1
    `,
    [current_phase_id]
  );

  if (triggers.rows.length === 0) return;

  for (const trigger of triggers.rows) {

    const vitals = await pool.query(
      `
      SELECT value
      FROM patient_vitals
      WHERE protocol_id = $1
        AND metric_type = $2
      ORDER BY day_number DESC
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

    if (triggered) {
      await pool.query(
        `
        INSERT INTO phase_transition_requests (
          patient_protocol_id,
          from_phase,
          to_phase,
          reason
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          patient_protocol_id,
          trigger.revert_to_phase + 1,
          trigger.revert_to_phase,
          'Relapse trigger activated'
        ]
      );
    }
  }
}

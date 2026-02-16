const pool = require('../../../db');

/**
 * ======================================
 * Submit Daily Report
 * ======================================
 */
exports.submitDailyReport = async (protocolId, userId, reportText) => {

  if (!reportText || typeof reportText !== 'string') {
    throw new Error('Report text is required');
  }

  // 1️⃣ Verify protocol
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
    throw new Error('Active protocol not found for this patient');
  }

  const protocol = protocolRes.rows[0];

  // 2️⃣ Calculate day number
  let dayNumber = 1;

  if (protocol.started_at) {
    const startedDate = new Date(protocol.started_at);
    const today = new Date();

    const diffTime = today.getTime() - startedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    dayNumber = diffDays + 1;
  }

  // 3️⃣ Check if report already exists for today
  const existingReport = await pool.query(
    `
    SELECT id
    FROM patient_daily_reports
    WHERE protocol_id = $1
      AND day_number = $2
    `,
    [protocolId, dayNumber]
  );

  let reportRow;

  if (existingReport.rows.length > 0) {
    // UPDATE existing report
    const updateRes = await pool.query(
      `
      UPDATE patient_daily_reports
      SET notes = $1,
          phase_id = $2,
          updated_at = NOW()
      WHERE protocol_id = $3
        AND day_number = $4
      RETURNING *
      `,
      [
        reportText,
        protocol.current_phase_id,
        protocolId,
        dayNumber
      ]
    );

    reportRow = updateRes.rows[0];

  } else {
    // INSERT new report
    const insertRes = await pool.query(
      `
      INSERT INTO patient_daily_reports (
        patient_id,
        protocol_id,
        phase_id,
        day_number,
        notes,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [
        userId,
        protocolId,
        protocol.current_phase_id,
        dayNumber,
        reportText
      ]
    );

    reportRow = insertRes.rows[0];
  }

  // 4️⃣ AI Interpretation
  const lower = reportText.toLowerCase();

  let interpretation = "Good adherence today.";
  let recoveryAdvice = "Continue following the protocol.";
  let complianceScore = 100;
  let detectedViolations = [];

  if (lower.includes('rice')) {
    complianceScore -= 30;
    detectedViolations.push("High glycemic intake");
  }

  if (lower.includes('sugar')) {
    complianceScore -= 30;
    detectedViolations.push("Sugar consumption");
  }

  if (lower.includes('skipped') || lower.includes('missed')) {
    complianceScore -= 20;
    detectedViolations.push("Missed required activity");
  }

  if (detectedViolations.length > 0) {
    interpretation = "Deviation detected from protocol guidelines.";
    recoveryAdvice = "Reduce carbohydrate intake tomorrow and complete missed activities.";
  }

  if (complianceScore < 0) complianceScore = 0;

  // 5️⃣ Save AI feedback
  await pool.query(
    `
    UPDATE patient_daily_reports
    SET 
      ai_feedback = $1,
      compliance_score = $2,
      violations = $3
    WHERE id = $4
    `,
    [
      JSON.stringify({ interpretation, recoveryAdvice }),
      complianceScore,
      detectedViolations,
      reportRow.id
    ]
  );

  return {
    report: reportRow,
    ai_feedback: {
      interpretation,
      recoveryAdvice,
      complianceScore,
      detectedViolations
    }
  };
};

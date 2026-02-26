const pool = require('../db');
const aiAdapter = require('./aiAdapter.service');

/**
 * ======================================
 * AI ORCHESTRATOR SERVICE
 * ======================================
 *
 * Responsibilities:
 * - Validate AI generation eligibility
 * - Call AI Adapter (provider abstraction)
 * - Store draft summary
 * - Approve summary (doctor gate)
 * - Provide approved summary to patient
 *
 * Federated-safe:
 * - No provider imports here
 * - No OpenAI calls here
 * - No cross-schema contamination
 */


/**
 * ======================================
 * GENERATE CONSULTATION SUMMARY
 * ======================================
 */
exports.generateConsultationSummary = async (consultationId) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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

    // ===============================
    // ELIGIBILITY RULES
    // ===============================

    if (consultation.payment_status !== 'paid') {
      throw new Error('Consultation not paid');
    }

    if (consultation.booking_status !== 'confirmed') {
      throw new Error('Consultation not confirmed');
    }

    if (!consultation.scheduled_at) {
      throw new Error('Consultation not scheduled');
    }

    if (
      consultation.consultation_type === 'cross_border' &&
      consultation.primary_doctor_required !== true
    ) {
      throw new Error('Primary doctor approval required for cross-border');
    }

    if (consultation.ai_summary_generated === true) {
      throw new Error('AI summary already generated');
    }

    // ===============================
    // CALL AI ADAPTER
    // ===============================

    const prompt = `
Generate a structured clinical consultation summary.

Consultation ID: ${consultation.id}
Patient ID: ${consultation.patient_id}
Primary Doctor ID: ${consultation.primary_doctor_id}
Scheduled At: ${consultation.scheduled_at}

Return a concise medical summary suitable for doctor review.
    `;

    const aiResponse = await aiAdapter.generateCompletion({
      prompt,
      metadata: { consultationId: consultation.id }
    });

    const draftSummary = `
AI Draft Summary:
Generated at: ${new Date().toISOString()}
Provider: ${aiResponse.provider}
Model: ${aiResponse.model}
Region: ${aiResponse.region}
Latency: ${aiResponse.latency_ms}ms

----------------------------------------

${aiResponse.content}
    `;

    // ===============================
    // STORE DRAFT
    // ===============================

    await client.query(
      `
      UPDATE marketplace.consultations
      SET ai_summary_draft = $1,
          ai_summary_generated = true,
          ai_summary_approved = false
      WHERE id = $2
      `,
      [draftSummary, consultationId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      draft: draftSummary
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


/**
 * ======================================
 * APPROVE AI SUMMARY
 * ======================================
 */
exports.approveConsultationSummary = async (consultationId, doctorId) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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

    if (consultation.ai_summary_generated !== true) {
      throw new Error('AI summary not generated yet');
    }

    if (consultation.ai_summary_approved === true) {
      throw new Error('AI summary already approved');
    }

    if (consultation.primary_doctor_id !== doctorId) {
      throw new Error('Only primary doctor can approve summary');
    }

    await client.query(
      `
      UPDATE marketplace.consultations
      SET ai_summary_approved = true,
          ai_summary_approved_at = NOW()
      WHERE id = $1
      `,
      [consultationId]
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


/**
 * ======================================
 * GET APPROVED SUMMARY (PATIENT VIEW)
 * ======================================
 */
exports.getApprovedSummaryForPatient = async (consultationId, patientId) => {

  const result = await pool.query(
    `
    SELECT ai_summary_draft
    FROM marketplace.consultations
    WHERE id = $1
      AND patient_id = $2
      AND ai_summary_approved = true
    `,
    [consultationId, patientId]
  );

  if (result.rows.length === 0) {
    throw new Error('Summary not available');
  }

  return {
    summary: result.rows[0].ai_summary_draft
  };
};
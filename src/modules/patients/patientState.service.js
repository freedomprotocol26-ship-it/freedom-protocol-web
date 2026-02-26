const pool = require("../../db");

/**
 * Build full metabolic state snapshot for a patient
 * @param {string} patientId
 */
async function buildMetabolicState(patientId) {
  try {
    if (!patientId) {
      throw new Error("patientId is required");
    }

    // 1️⃣ Fetch active protocol using PostgreSQL
    const protocolResult = await pool.query(
      `
      SELECT *
      FROM patient_protocols
      WHERE patient_id = $1
      LIMIT 1
      `,
      [patientId]
    );

    if (protocolResult.rows.length === 0) {
      throw new Error("No active protocol found for patient");
    }

    const protocol = protocolResult.rows[0];

    const phaseNumber = protocol.phase_number;
    const phaseStartDate = protocol.phase_start_date;
    const maintenanceDriftCounter =
      protocol.maintenance_drift_counter || 0;

    return {
      status: "protocol_fetched",
      phaseNumber,
      phaseStartDate,
      maintenanceDriftCounter,
    };

  } catch (error) {
    console.error("Error building metabolic state:", error);
    throw error;
  }
}

module.exports = {
  buildMetabolicState,
};
/**
 * Freedom Protocol - Upload Repository
 * Stores patient uploads (labs, images, food photos, documents)
 */

const db = require('../db');

/**
 * Create upload record
 */
const createUpload = async (data) => {

  const query = `
    INSERT INTO uploads (
      patient_id,
      doctor_id,
      type,
      file_url,
      ai_draft,
      doctor_note,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `;

  const values = [
    data.patient_id,
    data.doctor_id,
    data.type,
    data.file_url,
    data.ai_draft || null,
    data.doctor_note || null,
    data.status || 'pending'
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get uploads by patient
 */
const getUploadsByPatient = async (patientId) => {

  const query = `
    SELECT *
    FROM uploads
    WHERE patient_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [patientId]);
  return result.rows;
};

/**
 * Update upload
 */
const updateUpload = async (id, updates) => {

  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${i}`);
    values.push(value);
    i++;
  }

  values.push(id);

  const query = `
    UPDATE uploads
    SET ${fields.join(', ')},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $${i}
    RETURNING *
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = {
  createUpload,
  getUploadsByPatient,
  updateUpload
};

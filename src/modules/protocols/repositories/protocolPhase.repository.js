const db = require('../../../db');

const getPhaseById = async (phaseId) => {
  const query = `
    SELECT 
      id,
      version_id,
      name,
      order_index,
      day_start,
      day_end,
      created_at
    FROM protocol_phases
    WHERE id = $1
  `;
  const { rows } = await db.query(query, [phaseId]);
  return rows[0];
};

const getPhasesByVersionId = async (versionId) => {
  const query = `
    SELECT 
      id,
      version_id,
      name,
      order_index,
      day_start,
      day_end,
      created_at
    FROM protocol_phases
    WHERE version_id = $1
    ORDER BY order_index ASC
  `;
  const { rows } = await db.query(query, [versionId]);
  return rows;
};

const getPhaseByOrder = async (versionId, order_index) => {
  const query = `
    SELECT 
      id,
      version_id,
      name,
      order_index,
      day_start,
      day_end,
      created_at
    FROM protocol_phases
    WHERE version_id = $1 AND order_index = $2
  `;
  const { rows } = await db.query(query, [versionId, order_index]);
  return rows[0];
};

const createPhase = async ({ version_id, name, order_index, day_start, day_end }) => {
  const query = `
    INSERT INTO protocol_phases (version_id, name, order_index, day_start, day_end)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING 
      id,
      version_id,
      name,
      order_index,
      day_start,
      day_end,
      created_at
  `;
  const { rows } = await db.query(query, [version_id, name, order_index, day_start, day_end]);
  return rows[0];
};

module.exports = {
  getPhaseById,
  getPhasesByVersionId,
  getPhaseByOrder,
  createPhase
};
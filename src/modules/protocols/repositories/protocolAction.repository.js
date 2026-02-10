const db = require('../config/database');

const getActionById = async (actionId) => {
  const query = `
    SELECT 
      id,
      phase_id,
      action_type,
      title,
      description,
      payload,
      order_index,
      created_at
    FROM protocol_actions
    WHERE id = $1
  `;
  const { rows } = await db.query(query, [actionId]);
  return rows[0];
};

const getActionsByPhaseId = async (phaseId) => {
  const query = `
    SELECT 
      id,
      phase_id,
      action_type,
      title,
      description,
      payload,
      order_index,
      created_at
    FROM protocol_actions
    WHERE phase_id = $1
    ORDER BY order_index ASC
  `;
  const { rows } = await db.query(query, [phaseId]);
  return rows;
};

const createAction = async ({ phase_id, action_type, title, description, payload, order_index }) => {
  const query = `
    INSERT INTO protocol_actions (phase_id, action_type, title, description, payload, order_index)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING 
      id,
      phase_id,
      action_type,
      title,
      description,
      payload,
      order_index,
      created_at
  `;
  const { rows } = await db.query(query, [phase_id, action_type, title, description, payload, order_index]);
  return rows[0];
};

module.exports = {
  getActionById,
  getActionsByPhaseId,
  createAction
};
const db = require('../config/database');

const getTemplateById = async (templateId) => {
  const query = `
    SELECT 
      id,
      name,
      condition,
      description,
      created_by,
      created_at
    FROM protocol_templates
    WHERE id = $1
  `;
  const { rows } = await db.query(query, [templateId]);
  return rows[0];
};

const getTemplateByCondition = async (condition) => {
  const query = `
    SELECT 
      id,
      name,
      condition,
      description,
      created_by,
      created_at
    FROM protocol_templates
    WHERE condition = $1
  `;
  const { rows } = await db.query(query, [condition]);
  return rows[0];
};

const listTemplates = async () => {
  const query = `
    SELECT 
      id,
      name,
      condition,
      description,
      created_by,
      created_at
    FROM protocol_templates
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query);
  return rows;
};

const createTemplate = async ({ name, condition, description, created_by }) => {
  const query = `
    INSERT INTO protocol_templates (name, condition, description, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING 
      id,
      name,
      condition,
      description,
      created_by,
      created_at
  `;
  const { rows } = await db.query(query, [name, condition, description, created_by]);
  return rows[0];
};

module.exports = {
  getTemplateById,
  getTemplateByCondition,
  listTemplates,
  createTemplate
};
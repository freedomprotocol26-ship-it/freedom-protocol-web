const db = require('../config/database');

const getVersionById = async (versionId) => {
  const query = `
    SELECT 
      id,
      template_id,
      version_number,
      changelog,
      created_by,
      created_at
    FROM protocol_versions
    WHERE id = $1
  `;
  const { rows } = await db.query(query, [versionId]);
  return rows[0];
};

const getVersionsByTemplateId = async (templateId) => {
  const query = `
    SELECT 
      id,
      template_id,
      version_number,
      changelog,
      created_by,
      created_at
    FROM protocol_versions
    WHERE template_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(query, [templateId]);
  return rows;
};

const getLatestVersionByTemplateId = async (templateId) => {
  const query = `
    SELECT 
      id,
      template_id,
      version_number,
      changelog,
      created_by,
      created_at
    FROM protocol_versions
    WHERE template_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await db.query(query, [templateId]);
  return rows[0];
};

const createVersion = async ({ template_id, version_number, changelog, created_by }) => {
  const query = `
    INSERT INTO protocol_versions (template_id, version_number, changelog, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING 
      id,
      template_id,
      version_number,
      changelog,
      created_by,
      created_at
  `;
  const { rows } = await db.query(query, [template_id, version_number, changelog, created_by]);
  return rows[0];
};

module.exports = {
  getVersionById,
  getVersionsByTemplateId,
  getLatestVersionByTemplateId,
  createVersion
};
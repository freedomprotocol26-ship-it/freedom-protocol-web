/**
 * Freedom Protocol - Refresh Token Repository
 * Database queries for refresh token operations
 */

const db = require('../db');

/**
 * Create new refresh token
 *
 * @param {Object} data
 * @param {string} data.user_id
 * @param {string} data.token_hash
 * @param {Date} data.expires_at
 */
const createRefreshToken = async (data) => {
  const query = `
    INSERT INTO refresh_tokens (
      user_id,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)
    RETURNING 
      id,
      user_id,
      token_hash,
      expires_at,
      revoked_at,
      created_at
  `;

  const values = [
    data.user_id,
    data.token_hash,
    data.expires_at
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Get refresh token by hash
 */
const getRefreshToken = async (token_hash) => {
  const query = `
    SELECT
      id,
      user_id,
      token_hash,
      expires_at,
      revoked_at,
      created_at
    FROM refresh_tokens
    WHERE token_hash = $1
  `;

  const result = await db.query(query, [token_hash]);
  return result.rows[0] || null;
};

/**
 * Revoke refresh token
 */
const revokeRefreshToken = async (token_hash) => {
  const query = `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = $1
    RETURNING id
  `;

  const result = await db.query(query, [token_hash]);
  return result.rows.length > 0;
};

/**
 * Delete expired or revoked tokens
 */
const deleteExpiredTokens = async () => {
  const query = `
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
       OR revoked_at IS NOT NULL
    RETURNING id
  `;

  const result = await db.query(query);
  return result.rows.length;
};

module.exports = {
  createRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  deleteExpiredTokens
};

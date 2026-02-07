/**
 * Freedom Protocol - User Repository
 * Database queries for user operations
 */

const db = require('../db');
const BaseError = require('../errors/baseError');

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  const query = `
    SELECT 
      id,
      email,
      phone,
      password,
      role,
      profile_picture_url,
      facility_id,
      doctor_id,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
  `;

  const result = await db.query(query, [email]);
  return result.rows[0] || null;
};

/**
 * Get user by ID
 */
const getUserById = async (id) => {
  const query = `
    SELECT 
      id,
      email,
      phone,
      password,
      role,
      profile_picture_url,
      facility_id,
      doctor_id,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Create new user
 */
const createUser = async (data) => {
  const query = `
    INSERT INTO users (
      email,
      phone,
      password,
      role,
      facility_id,
      doctor_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING 
      id,
      email,
      phone,
      role,
      profile_picture_url,
      facility_id,
      doctor_id,
      is_active,
      created_at,
      updated_at
  `;

  const values = [
    data.email,
    data.phone || null,
    data.password,
    data.role,
    data.facility_id || null,
    data.doctor_id || null
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Update user
 */
const updateUser = async (id, updates) => {

  const allowedFields = [
    'email',
    'phone',
    'password',
    'role',
    'profile_picture_url',
    'facility_id',
    'doctor_id',
    'is_active'
  ];

  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    throw new BaseError('No valid fields to update', 400, 'NO_FIELDS');
  }

  values.push(id);

  const query = `
    UPDATE users
    SET ${fields.join(', ')},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
    RETURNING 
      id,
      email,
      phone,
      role,
      profile_picture_url,
      facility_id,
      doctor_id,
      is_active,
      created_at,
      updated_at
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser
};

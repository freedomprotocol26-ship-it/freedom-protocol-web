const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../../db');
const authRepository = require('../repositories/auth.repository');

/**
 * ======================================
 * LOGIN
 * ======================================
 */
async function login(email, password) {
  const user = await authRepository.getUserByEmail(email);

  if (!user) {
    return {
      success: false,
      message: 'Invalid credentials',
    };
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    return {
      success: false,
      message: 'Invalid credentials',
    };
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      approval_status: user.approval_status,
    },
  };
}

/**
 * ======================================
 * REGISTER
 * ======================================
 */
async function register(email, password, role, agreedToTerms) {
  if (!agreedToTerms) {
    return {
      success: false,
      message:
        'You must agree to the Freedom Protocol Participation Agreement before registering.',
    };
  }

  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    return {
      success: false,
      message: 'User already exists.',
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Create user account
    const userResult = await client.query(
      `
      INSERT INTO users 
      (email, password_hash, role, agreed_to_terms, agreed_at)
      VALUES ($1, $2, $3, TRUE, NOW())
      RETURNING id, email, role
      `,
      [email, hashedPassword, role]
    );

    const user = userResult.rows[0];

    // 2️⃣ Create app_users profile
    await client.query(
      `
      INSERT INTO app_users (id, full_name, role, is_active, created_at)
      VALUES ($1, $2, $3, TRUE, NOW())
      `,
      [user.id, email, role]
    );

    // 3️⃣ If registering as patient, link to invited patient record
    if (role === 'patient') {
      const patientUpdate = await client.query(
        `
        UPDATE patients
        SET user_id = $1
        WHERE email = $2
        RETURNING id
        `,
        [user.id, email]
      );

      if (patientUpdate.rows.length === 0) {
        throw new Error(
          'No existing patient invitation found. Please contact your doctor.'
        );
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Registration successful.',
      user,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);

    return {
      success: false,
      message:
        error.message ||
        'Registration failed. Please ensure you were invited first.',
    };
  } finally {
    client.release();
  }
}

/**
 * ======================================
 * APPLY DOCTOR
 * ======================================
 */
async function applyDoctor(userId) {
  const updated = await authRepository.updateDoctorApprovalStatus(
    userId,
    'pending'
  );

  if (!updated) {
    return {
      success: false,
      message: 'Doctor application failed or invalid role',
    };
  }

  return {
    success: true,
    message: 'Doctor application submitted for approval',
    data: updated,
  };
}

module.exports = {
  login,
  register,
  applyDoctor,
};
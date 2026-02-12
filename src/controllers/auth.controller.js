/**
 * Freedom Protocol - Auth Controller
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const subscriptionService = require('../modules/subscriptions/subscription.service');

/**
 * Doctor Application (Public)
 */
exports.applyDoctor = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password required'
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  try {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, approval_status, account_status)
       VALUES ($1,$2,'doctor','pending','active')
       RETURNING id,email,role,approval_status,account_status`,
      [email, hashed]
    );

    return res.status(201).json({
      success: true,
      message: 'Application submitted. Awaiting admin approval.',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    throw err; // Let global error middleware handle unexpected errors
  }
};

/**
 * Login (Doctor or Patient)
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query(
    'SELECT * FROM users WHERE email=$1',
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Doctor approval check
  if (user.role === 'doctor' && user.approval_status !== 'approved') {
    return res.status(403).json({
      success: false,
      error: 'Your account is pending approval.'
    });
  }

  // Global account status check
  if (user.account_status !== 'active') {
    return res.status(403).json({
      success: false,
      error: `Account is ${user.account_status}.`
    });
  }

  // Subscription enforcement for patients
  if (user.role === 'patient') {
    const status = await subscriptionService.isSubscriptionActive(user.id);

    if (!status.active) {
      return res.status(403).json({
        success: false,
        error: 'Subscription inactive or expired'
      });
    }
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    token
  });
};

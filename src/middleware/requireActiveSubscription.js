const pool = require('../db');

async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Doctors and admins bypass subscription enforcement
    if (req.user.role === 'doctor' || req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Invalid role',
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM subscriptions
      WHERE patient_id = $1
        AND status = 'active'
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      ORDER BY ends_at DESC
      LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
      });
    }

    req.subscription = result.rows[0];
    next();

  } catch (err) {
    console.error('Subscription gate error:', err);
    return res.status(500).json({
      success: false,
      message: 'Subscription verification failed',
    });
  }
}

module.exports = requireActiveSubscription;

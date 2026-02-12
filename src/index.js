/**
 * Freedom Protocol - Server Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const patientRoutes = require('./routes/patient');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const facilityRoutes = require('./modules/facilities/facility.routes');
const protocolRoutes = require('./modules/protocols/routes/protocol.routes');
const doctorDashboardRoutes = require('./modules/doctorDashboard/routes/doctorDashboard.routes');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * ==========================================
 * GLOBAL MIDDLEWARE
 * ==========================================
 */

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

/**
 * ==========================================
 * CORE ROUTES
 * ==========================================
 */

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/patients', patientRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/payments', paymentRoutes);
app.use('/facilities', facilityRoutes);
app.use('/', protocolRoutes);
app.use('/', doctorDashboardRoutes);

/**
 * ==========================================
 * HEALTH CHECK
 * ==========================================
 */

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    return res.json({
      success: true,
      status: 'ok',
      time: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * ==========================================
 * 404 HANDLER
 * ==========================================
 */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

/**
 * ==========================================
 * GLOBAL ERROR HANDLER
 * ==========================================
 */

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

/**
 * ==========================================
 * START SERVER
 * ==========================================
 */

app.listen(PORT, () => {
  console.log(`API running on ${PORT}`);
});

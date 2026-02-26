/**
 * Freedom Protocol - Server Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

/**
 * ===============================
 * MODULE ROUTES
 * ===============================
 */

const adminRoutes = require('./modules/admin/routes/admin.routes');
const authRoutes = require('./modules/auth/routes/auth.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const facilityRoutes = require('./modules/facilities/facility.routes');
const protocolRoutes = require('./modules/protocols/routes/protocol.routes');
const doctorDashboardRoutes = require('./modules/doctorDashboard/routes/doctorDashboard.routes');
const patientRoutes = require('./modules/patients/routes/patient.routes');
const consultationRoutes = require('./modules/consultations/routes/consultation.routes');
const secondOpinionRoutes = require('./modules/doctor/routes/secondOpinion.routes');
const supervisoryRoutes = require('./modules/doctor/routes/supervisory.routes');

const marketplaceRoutes = require('./modules/marketplace/routes/marketplace.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const PORT = process.env.PORT || 4000;

/**
 * ===============================
 * GLOBAL MIDDLEWARE
 * ===============================
 */

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

/**
 * ===============================
 * ROUTE REGISTRATION
 * ===============================
 */

app.use('/auth', authRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/payments', paymentRoutes);
app.use('/facilities', facilityRoutes);
app.use('/protocols', protocolRoutes);

app.use('/doctor', doctorDashboardRoutes);
app.use('/doctor', secondOpinionRoutes);
app.use('/doctor', supervisoryRoutes);

app.use('/admin', adminRoutes);
app.use('/patients', patientRoutes);
app.use('/consultations', consultationRoutes);

app.use('/marketplace', marketplaceRoutes);
app.use('/ai', aiRoutes);

/**
 * ===============================
 * DEBUG ROUTE
 * ===============================
 */

app.get('/debug/db', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT current_database() AS database,
             current_schema() AS schema,
             inet_server_addr() AS server_ip;
    `);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * ===============================
 * HEALTH CHECK
 * ===============================
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
 * ===============================
 * 404 HANDLER
 * ===============================
 */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

/**
 * ===============================
 * GLOBAL ERROR HANDLER
 * ===============================
 */

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

/**
 * ===============================
 * START SERVER
 * ===============================
 */

app.listen(PORT, () => {
  console.log(`API running on ${PORT}`);
});
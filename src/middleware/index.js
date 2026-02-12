/**
 * Freedom Protocol - Backend Server
 */

require('dotenv').config();

const express = require('express');
const path = require('path');

const pool = require('./db');

// ROUTES
const authRoutes = require('./routes/auth');
const patientRoutes = require('./modules/patients/patient.routes');
const doctorRoutes = require('./routes/doctor');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// ROUTES
// ============================================

// Auth Routes
app.use('/auth', authRoutes);

// Patient Routes
app.use('/patients', patientRoutes);

// Doctor Routes
app.use('/doctor', doctorRoutes);

// Admin Routes
app.use('/admin', adminRoutes);

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
  console.log(`Freedom Protocol backend running on port ${PORT}`);
});

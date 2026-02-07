/**
 * Freedom Protocol - Backend Server
 */

require('dotenv').config();

const express = require('express');
const path = require('path');

const { pool } = require('./db');
const patientRoutes = require('./modules/patients/patient.routes');

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

app.use(patientRoutes);

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

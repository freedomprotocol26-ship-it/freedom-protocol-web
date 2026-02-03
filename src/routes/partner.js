const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * ===============================
 * PARTNER APPLICATION (PUBLIC)
 * ===============================
 */
router.post('/partner/apply', async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      license_number,
      license_type,
      specialty,
      facility_name,
      facility_address,
      years_experience
    } = req.body;

    if (!full_name || !email || !phone || !license_number || !license_type) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    const existing = await pool.query(
      'SELECT id FROM partners WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Partner with this email already exists'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO partners (
        full_name,
        email,
        phone,
        license_number,
        license_type,
        specialty,
        facility_name,
        facility_address,
        years_experience,
        status,
        application_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',NOW())
      RETURNING *
      `,
      [
        full_name,
        email,
        phone,
        license_number,
        license_type,
        specialty || null,
        facility_name || null,
        facility_address || null,
        years_experience || null
      ]
    );

    res.json({
      success: true,
      partner: result.rows[0]
    });
  } catch (error) {
    console.error('Partner apply error:', error);
    res.status(500).json({
      error: 'Failed to submit application'
    });
  }
});

module.exports = router;

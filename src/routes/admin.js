const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

// ======================================
// GLOBAL ADMIN AUTHENTICATION
// ======================================

router.use(authenticateToken);

router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
});

// ======================================
// GET PENDING DOCTORS
// ======================================

router.get('/doctors/pending', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        email,
        approval_status,
        account_status,
        created_at
      FROM users
      WHERE role = 'doctor'
      AND approval_status = 'pending'
      ORDER BY created_at DESC
    `;

    const { rows } = await db.query(query);

    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching pending doctors:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending doctors'
    });
  }
});

// ======================================
// APPROVE / REJECT DOCTOR
// ======================================

router.patch('/doctors/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid approval status'
      });
    }

    const updateQuery = `
      UPDATE users 
      SET approval_status = $1
      WHERE id = $2
      AND role = 'doctor'
      RETURNING id, email, approval_status
    `;

    const { rows } = await db.query(updateQuery, [approval_status, id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Doctor ${approval_status} successfully`,
      data: rows[0]
    });

  } catch (error) {
    console.error('Error updating doctor approval:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update doctor approval'
    });
  }
});

module.exports = router;

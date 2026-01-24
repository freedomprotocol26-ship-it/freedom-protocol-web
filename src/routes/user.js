const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Import auth middleware
const { authenticateToken } = require('../middleware/auth');

// Get user profile
router.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
router.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, phone } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($1, name), 
                 phone = COALESCE($2, phone),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, name, email, phone, created_at`,
            [name, phone, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;

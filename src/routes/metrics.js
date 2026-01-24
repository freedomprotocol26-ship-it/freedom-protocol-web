const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all glucose readings for a user
router.get('/api/metrics/glucose', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        // Extract user ID from token (simplified - you may need to decode JWT)
        const userId = req.user.userId;
        
        // User authenticated via middleware

        const result = await pool.query(
            `SELECT * FROM glucose_readings 
             WHERE user_id = $1 
             ORDER BY measured_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            readings: result.rows
        });

    } catch (error) {
        console.error('Error fetching glucose readings:', error);
        res.status(500).json({ error: 'Failed to fetch glucose readings' });
    }
});

// Log a new glucose reading
router.post('/api/metrics/glucose', async (req, res) => {
    try {
        const { glucose_level, measured_at, notes } = req.body;
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        // Extract user ID from token
        const userId = req.user.userId;
        
        // User authenticated via middleware

        // Validation
        if (!glucose_level || !measured_at) {
            return res.status(400).json({ error: 'Glucose level and measurement time are required' });
        }

        // Insert glucose reading
        const result = await pool.query(
            `INSERT INTO glucose_readings (user_id, glucose_level, measured_at, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, glucose_level, measured_at, notes]
        );

        res.json({
            success: true,
            message: 'Glucose reading logged successfully',
            reading: result.rows[0]
        });

    } catch (error) {
        console.error('Error logging glucose reading:', error);
        res.status(500).json({ error: 'Failed to log glucose reading' });
    }
});

// Get glucose statistics for a user
router.get('/api/metrics/glucose/stats', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const userId = req.user.userId;
        
        // User authenticated via middleware

        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_readings,
                AVG(glucose_level) as average_glucose,
                MIN(glucose_level) as min_glucose,
                MAX(glucose_level) as max_glucose
             FROM glucose_readings 
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching glucose stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;

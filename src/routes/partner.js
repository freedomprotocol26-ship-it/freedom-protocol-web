const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Submit partner application
router.post('/api/partner/apply', async (req, res) => {
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

        // Validate required fields
        if (!full_name || !email || !phone || !license_number || !license_type || !facility_name || !facility_address || !years_experience) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        // Check if email already exists
        const existingPartner = await pool.query(
            'SELECT id FROM partners WHERE email = $1',
            [email]
        );

        if (existingPartner.rows.length > 0) {
            return res.status(400).json({ error: 'An application with this email already exists' });
        }

        // Insert partner application
        const result = await pool.query(
            `INSERT INTO partners (
                full_name, email, phone, license_number, license_type,
                specialty, facility_name, facility_address, years_experience,
                status, application_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
            RETURNING id, full_name, email, status`,
            [full_name, email, phone, license_number, license_type, specialty, facility_name, facility_address, years_experience]
        );

        const partner = result.rows[0];

        // Log activity
        await pool.query(
            `INSERT INTO partner_activity_log (partner_id, activity_type, description)
             VALUES ($1, 'application', $2)`,
            [partner.id, `New partner application submitted by ${full_name}`]
        );

        res.json({
            success: true,
            message: 'Application submitted successfully',
            partner: {
                id: partner.id,
                name: partner.full_name,
                email: partner.email,
                status: partner.status
            }
        });

    } catch (error) {
        console.error('Partner application error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// Get all partner applications (for admin)
router.get('/api/admin/partners', async (req, res) => {
    try {
        const { status } = req.query; // Filter by status if provided

        let query = `
            SELECT id, full_name, email, phone, license_type, license_number,
                   specialty, facility_name, status, application_date,
                   years_experience, total_referrals, active_patients
            FROM partners
        `;

        const params = [];
        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY application_date DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            partners: result.rows
        });

    } catch (error) {
        console.error('Fetch partners error:', error);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// Approve partner application
router.post('/api/admin/partners/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewed_by, commission_rate } = req.body;

        // Update partner status
        const result = await pool.query(
            `UPDATE partners 
             SET status = 'approved', 
                 reviewed_date = NOW(),
                 reviewed_by = $1,
                 commission_rate = $2
             WHERE id = $3
             RETURNING *`,
            [reviewed_by || 'Admin', commission_rate || 10.00, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        const partner = result.rows[0];

        // Log activity
        await pool.query(
            `INSERT INTO partner_activity_log (partner_id, activity_type, description, performed_by)
             VALUES ($1, 'approval', $2, $3)`,
            [id, `Partner application approved`, reviewed_by || 'Admin']
        );

        res.json({
            success: true,
            message: 'Partner approved successfully',
            partner
        });

    } catch (error) {
        console.error('Partner approval error:', error);
        res.status(500).json({ error: 'Failed to approve partner' });
    }
});

// Reject partner application
router.post('/api/admin/partners/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewed_by, rejection_reason } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        // Update partner status
        const result = await pool.query(
            `UPDATE partners 
             SET status = 'rejected', 
                 reviewed_date = NOW(),
                 reviewed_by = $1,
                 rejection_reason = $2
             WHERE id = $3
             RETURNING *`,
            [reviewed_by || 'Admin', rejection_reason, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        // Log activity
        await pool.query(
            `INSERT INTO partner_activity_log (partner_id, activity_type, description, performed_by)
             VALUES ($1, 'rejection', $2, $3)`,
            [id, `Partner application rejected: ${rejection_reason}`, reviewed_by || 'Admin']
        );

        res.json({
            success: true,
            message: 'Partner application rejected'
        });

    } catch (error) {
        console.error('Partner rejection error:', error);
        res.status(500).json({ error: 'Failed to reject partner' });
    }
});

module.exports = router;

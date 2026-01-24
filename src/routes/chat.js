const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');
const jwt = require('jsonwebtoken');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Helper: Get glucose context
async function getGlucoseContext(userId) {
    try {
        const data = await pool.query(
            `SELECT glucose_level, measured_at, notes 
             FROM glucose_readings 
             WHERE user_id = $1 
             ORDER BY measured_at DESC 
             LIMIT 30`,
            [userId]
        );

        if (data.rows.length === 0) {
            return 'No glucose readings yet.';
        }

        const readings = data.rows.map(r => parseFloat(r.glucose_level));
        const avg = (readings.reduce((a, b) => a + b, 0) / readings.length).toFixed(1);
        const latest = readings[0];
        
        let trend = 'insufficient data';
        if (readings.length >= 3) {
            trend = readings[0] < readings[2] ? 'improving' : 
                    readings[0] > readings[2] ? 'rising' : 'stable';
        }

        let context = `\n\nGlucose Data Summary:\n`;
        context += `Latest: ${latest} mmol/L\n`;
        context += `Average (last ${readings.length} readings): ${avg} mmol/L\n`;
        context += `Trend: ${trend}\n\n`;
        context += 'Recent readings:\n';
        
        data.rows.slice(0, 10).forEach(r => {
            const date = new Date(r.measured_at).toLocaleDateString();
            const time = new Date(r.measured_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            context += `- ${date} ${time}: ${r.glucose_level} mmol/L`;
            if (r.notes) context += ` (${r.notes})`;
            context += '\n';
        });
        
        return context;
    } catch (error) {
        console.error('Error getting glucose context:', error);
        return 'Unable to retrieve glucose data.';
    }
}

// Get comprehensive AI analysis
router.get('/api/chat/analysis', authenticateToken, async (req, res) => {
    try {
        console.log('AI analysis requested by user:', req.user.userId);
        
        // Get user info
        const userInfo = await pool.query(
            'SELECT name FROM app_users WHERE id = $1',
            [req.user.userId]
        );

        if (userInfo.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userName = userInfo.rows[0].name || 'User';
        const glucoseContext = await getGlucoseContext(req.user.userId);

        console.log('Calling Anthropic API for analysis...');

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: `You are a compassionate health coach for Freedom Protocol, helping ${userName} manage their health through lifestyle changes.

Freedom Protocol focuses on:
- Reversing metabolic conditions naturally
- Intermittent fasting protocols
- Regular glucose monitoring
- Whole food nutrition
- Sustainable lifestyle changes

${glucoseContext}

Provide a warm, personalized analysis covering:
1. Overall progress assessment
2. What the glucose trends mean
3. Specific actionable recommendations
4. Encouragement and motivation
5. What to focus on next

Keep it personal and actionable. Use mmol/L for glucose measurements.`,
            messages: [{
                role: 'user',
                content: 'Please analyze my glucose data and give me personalized health coaching advice.'
            }]
        });

        const aiResponse = response.content[0].text;
        console.log('AI analysis received, length:', aiResponse.length);

        // Save to conversations table
        await pool.query(
            `INSERT INTO conversations 
             (user_id, user_message, ai_response, created_at, needs_review)
             VALUES ($1, $2, $3, NOW(), true)`,
            [req.user.userId, 'Comprehensive analysis requested', aiResponse]
        );

        res.json({
            success: true,
            analysis: aiResponse
        });

    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({ 
            error: 'Failed to generate analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
});

// Quick feedback after logging glucose
router.post('/api/chat/quick-feedback', authenticateToken, async (req, res) => {
    try {
        const { glucose_level, measured_at, notes } = req.body;

        if (!glucose_level || !measured_at) {
            return res.status(400).json({ error: 'Glucose level and time required' });
        }

        const userInfo = await pool.query(
            'SELECT name FROM app_users WHERE id = $1',
            [req.user.userId]
        );

        const userName = userInfo.rows[0]?.name || 'User';
        const glucoseContext = await getGlucoseContext(req.user.userId);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 250,
            system: `You are a supportive health coach for Freedom Protocol. ${userName} just logged a glucose reading.

${glucoseContext}

Their new reading: ${glucose_level} mmol/L
Time: ${new Date(measured_at).toLocaleString()}
${notes ? `Notes: ${notes}` : ''}

Give brief, encouraging feedback (2-3 sentences). If the reading is high, offer ONE specific tip. If it's good, celebrate their progress! Be warm and personal.`,
            messages: [{
                role: 'user',
                content: 'What do you think about this reading?'
            }]
        });

        const aiResponse = response.content[0].text;

        // Save to conversations
        await pool.query(
            `INSERT INTO conversations 
             (user_id, user_message, ai_response, created_at, needs_review)
             VALUES ($1, $2, $3, NOW(), true)`,
            [req.user.userId, `Logged reading: ${glucose_level} mmol/L`, aiResponse]
        );

        res.json({
            success: true,
            feedback: aiResponse
        });

    } catch (error) {
        console.error('Quick feedback error:', error);
        res.status(500).json({ 
            error: 'Failed to generate feedback',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
        });
    }
});

// Get conversation history
router.get('/api/chat/history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT user_message, ai_response, doctor_notes, created_at, reviewed_at
             FROM conversations 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [req.user.userId]
        );

        res.json({
            success: true,
            conversations: result.rows
        });

    } catch (error) {
        console.error('Chat history error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Doctor: Get conversations needing review
router.get('/api/doctor/review-queue', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id, c.user_id, c.user_message, c.ai_response, 
                    c.created_at, u.name as patient_name, u.email as patient_email
             FROM conversations c
             JOIN app_users u ON c.user_id = u.id
             WHERE c.needs_review = true
             ORDER BY c.created_at DESC
             LIMIT 100`
        );

        res.json({ 
            success: true, 
            queue: result.rows 
        });
        
    } catch (error) {
        console.error('Review queue error:', error);
        res.status(500).json({ error: 'Failed to fetch review queue' });
    }
});

// Doctor: Add modification/approval
router.post('/api/doctor/modify/:conversationId', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { doctor_notes, approved } = req.body;

        await pool.query(
            `UPDATE conversations 
             SET doctor_notes = $1, 
                 reviewed_by = $2, 
                 reviewed_at = NOW(),
                 needs_review = false,
                 approved = $3
             WHERE id = $4`,
            [doctor_notes, req.user.userId, approved !== false, conversationId]
        );

        res.json({ 
            success: true, 
            message: 'Review saved successfully' 
        });

    } catch (error) {
        console.error('Modify conversation error:', error);
        res.status(500).json({ error: 'Failed to save review' });
    }
});

module.exports = router;

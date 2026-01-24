const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../db');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const jwt = require('jsonwebtoken');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// Helper: Get glucose context
async function getGlucoseContext(userId) {
    const data = await pool.query(
        `SELECT glucose_level, measured_at, notes 
         FROM glucose_readings 
         WHERE user_id = $1 
         ORDER BY measured_at DESC 
         LIMIT 30`,
        [userId]
    );

    if (data.rows.length === 0) return 'No glucose readings yet.';

    const readings = data.rows.map(r => parseFloat(r.glucose_level));
    const avg = (readings.reduce((a, b) => a + b, 0) / readings.length).toFixed(1);
    const latest = readings[0];
    const trend = readings.length >= 3 ? 
        (readings[0] < readings[2] ? 'improving' : readings[0] > readings[2] ? 'rising' : 'stable') : 
        'insufficient data';

    let context = `\n\nGlucose Data:\nLatest: ${latest} mmol/L | Average: ${avg} mmol/L | Trend: ${trend}\n\nRecent:\n`;
    data.rows.slice(0, 10).forEach(r => {
        const date = new Date(r.measured_at).toLocaleDateString();
        context += `- ${date}: ${r.glucose_level} mmol/L${r.notes ? ' (' + r.notes + ')' : ''}\n`;
    });
    return context;
}

// EXPLAINABILITY MIDDLEWARE
async function addExplainability(aiResponse, glucoseData, prompt) {
    try {
        const explainPrompt = `You provided this health coaching advice:

"${aiResponse}"

Based on this glucose data:
${glucoseData}

Now explain your reasoning in 2-3 sentences covering:
1. What data points you considered
2. Why you made these specific recommendations
3. Any relevant health principles applied

Keep it clear and concise for healthcare provider review.`;

        const explanation = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{ role: 'user', content: explainPrompt }]
        });

        return explanation.content[0].text;
    } catch (error) {
        console.error('Explainability error:', error);
        return 'Explanation generation failed';
    }
}

// Quick feedback after logging glucose
router.post('/api/chat/quick-feedback', authenticateToken, async (req, res) => {
    try {
        const { glucose_level, measured_at, notes } = req.body;

        const userInfo = await pool.query('SELECT name FROM app_users WHERE id = $1', [req.user.userId]);
        const userName = userInfo.rows[0]?.name || 'User';
        const glucoseContext = await getGlucoseContext(req.user.userId);

        const prompt = `You're a health coach. ${userName} just logged: ${glucose_level} mmol/L at ${new Date(measured_at).toLocaleString()}${notes ? ` (${notes})` : ''}.

${glucoseContext}

Give brief, encouraging feedback (2-3 sentences). If high, offer ONE tip. If good, celebrate!`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
        });

        const aiResponse = response.content[0].text;
        
        // Add explainability
        const explanation = await addExplainability(aiResponse, glucoseContext, prompt);

        // Save with explainability
        const saved = await pool.query(
            `INSERT INTO conversations 
             (user_id, user_message, ai_response, explanation, created_at, needs_review)
             VALUES ($1, $2, $3, $4, NOW(), true)
             RETURNING id`,
            [req.user.userId, `Logged: ${glucose_level} mmol/L`, aiResponse, explanation]
        );

        res.json({
            success: true,
            feedback: aiResponse,
            conversation_id: saved.rows[0].id
        });

    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Failed to generate feedback' });
    }
});

// Comprehensive analysis
router.get('/api/chat/analysis', authenticateToken, async (req, res) => {
    try {
        const userInfo = await pool.query('SELECT name FROM app_users WHERE id = $1', [req.user.userId]);
        const userName = userInfo.rows[0]?.name || 'User';
        const glucoseContext = await getGlucoseContext(req.user.userId);

        const prompt = `Analyze ${userName}'s glucose data and provide comprehensive coaching covering:
1. Progress assessment
2. Trends and meaning
3. Actionable recommendations
4. Encouragement
5. Next focus areas

${glucoseContext}

Be personal, warm, actionable. 300-400 words. Use mmol/L.`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
        });

        const aiResponse = response.content[0].text;
        const explanation = await addExplainability(aiResponse, glucoseContext, prompt);

        await pool.query(
            `INSERT INTO conversations 
             (user_id, user_message, ai_response, explanation, created_at, needs_review)
             VALUES ($1, $2, $3, $4, NOW(), true)`,
            [req.user.userId, 'Comprehensive analysis', aiResponse, explanation]
        );

        res.json({ success: true, analysis: aiResponse });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});

// Doctor: Get conversations needing review
router.get('/api/doctor/review-queue', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id, c.user_id, c.user_message, c.ai_response, c.explanation, 
                    c.created_at, u.name as patient_name, u.email as patient_email
             FROM conversations c
             JOIN app_users u ON c.user_id = u.id
             WHERE c.needs_review = true
             ORDER BY c.created_at DESC
             LIMIT 100`
        );

        res.json({ success: true, queue: result.rows });
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

        res.json({ success: true, message: 'Review saved' });

    } catch (error) {
        console.error('Modify error:', error);
        res.status(500).json({ error: 'Failed to save review' });
    }
});

module.exports = router;

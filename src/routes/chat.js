const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Import auth middleware
const { authenticateToken } = require('../middleware/auth');

// Send message to Claude AI
router.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        const userId = req.user.userId;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Fetch user's glucose readings for context
        const glucoseResult = await pool.query(
            `SELECT glucose_level, measured_at, notes 
             FROM glucose_readings 
             WHERE user_id = $1 
             ORDER BY measured_at DESC 
             LIMIT 10`,
            [userId]
        );

        const glucoseReadings = glucoseResult.rows;

        // Build system prompt with glucose context
        let systemPrompt = `You are a health coach for the Freedom Protocol - a 60-day program designed to help people manage chronic health conditions through lifestyle changes, intermittent fasting, and glucose monitoring.

Your role is to:
- Provide guidance on the Freedom Protocol
- Help users understand their glucose readings
- Offer encouragement and motivation
- Answer questions about diet, exercise, and health
- Be supportive but honest about the commitment required

Be conversational, empathetic, and practical. Focus on sustainable lifestyle changes.`;

        if (glucoseReadings.length > 0) {
            systemPrompt += `\n\nThe user has logged ${glucoseReadings.length} recent glucose readings:\n`;
            systemPrompt += glucoseReadings.map(r => {
                const date = new Date(r.measured_at).toLocaleDateString();
                return `- ${date}: ${r.glucose_level} mmol/L${r.notes ? ' (' + r.notes + ')' : ''}`;
            }).join('\n');
            systemPrompt += `\n\nUse this data to provide personalized feedback and encouragement. If they ask about their progress, reference specific numbers. If you notice concerning patterns (many high readings, sudden spikes), gently point them out and offer guidance.`;
        } else {
            systemPrompt += `\n\nNOTE: This user hasn't logged any glucose readings yet. Encourage them to start tracking their glucose levels to get personalized feedback and insights.`;
        }

        // Build conversation history for Claude
        const messages = conversationHistory || [];
        messages.push({
            role: 'user',
            content: message
        });

        // Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages
        });

        const aiMessage = response.content[0].text;

        // Save conversation to database
        await pool.query(
            `INSERT INTO conversations (user_id, user_message, ai_response, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [userId, message, aiMessage]
        );

        res.json({
            message: aiMessage,
            conversationId: response.id
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

// Get conversation history
router.get('/api/chat/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT * FROM conversations 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );

        res.json({
            success: true,
            history: result.rows
        });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;

// src/services/anthropic.service.js
const Anthropic = require('@anthropic-ai/sdk');

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate text from Anthropic safely.
 * Always returns a string or throws.
 */
async function generateText({
  system,
  user,
  maxTokens = 500,
  model = 'claude-sonnet-4-20250514',
}) {
  if (!system || !user) {
    throw new Error('System and user prompts are required');
  }

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [
        {
          role: 'user',
          content: user,
        },
      ],
    });

    if (!response || !Array.isArray(response.content)) {
      throw new Error('Unexpected Anthropic response shape');
    }

    const text = response.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Empty response from Anthropic');
    }

    return text;
  } catch (err) {
    console.error('Anthropic generateText error:', err);
    throw new Error('AI generation failed');
  }
}

module.exports = {
  generateText,
};

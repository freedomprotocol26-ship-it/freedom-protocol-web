/**
 * Claude API Service
 * 
 * Handles all interactions with the Anthropic Claude API.
 * This is where the coaching magic happens.
 */

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { getSystemPrompt } = require('../prompts/system-prompt');

// Initialize client (uses ANTHROPIC_API_KEY from environment)
const client = new Anthropic();

/**
 * Get a coaching response from Claude
 * 
 * @param {Object} user - User object from database
 * @param {string} userMessage - The message the user sent
 * @param {Array} recentMessages - Recent conversation history
 * @param {Object} additionalContext - Extra context (logs, measurements, etc.)
 * @returns {Promise<string>} Claude's response
 */
async function getCoachResponse(user, userMessage, recentMessages = [], additionalContext = {}) {
  try {
    // Build the system prompt with user context
    const systemPrompt = getSystemPrompt(user, {
      ...additionalContext,
      recentMessages
    });
    
    // Build conversation history for context
    // Claude needs alternating user/assistant messages
    const messages = buildMessageHistory(recentMessages, userMessage);
    
    console.log(`🤖 Calling Claude for user ${user.name} (Day ${user.current_day})`);
    
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
      system: systemPrompt,
      messages: messages
    });
    
    // Extract text from response
    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    console.log(`✅ Claude responded (${responseText.length} chars)`);
    
    return responseText;
    
  } catch (error) {
    console.error('❌ Claude API error:', error.message);
    
    // Return a graceful fallback message
    return getFallbackMessage(error);
  }
}

/**
 * Build message history for Claude
 * Ensures proper alternating user/assistant format
 */
function buildMessageHistory(recentMessages, currentMessage) {
  const messages = [];
  
  // Add recent conversation history
  for (const msg of recentMessages) {
    const role = msg.direction === 'inbound' ? 'user' : 'assistant';
    
    // Claude requires alternating roles, so we may need to combine messages
    if (messages.length > 0 && messages[messages.length - 1].role === role) {
      // Same role as previous, combine content
      messages[messages.length - 1].content += '\n' + msg.content;
    } else {
      messages.push({
        role: role,
        content: msg.content
      });
    }
  }
  
  // Add current user message
  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content += '\n' + currentMessage;
  } else {
    messages.push({
      role: 'user',
      content: currentMessage
    });
  }
  
  // Ensure conversation starts with user message
  if (messages.length > 0 && messages[0].role === 'assistant') {
    messages.shift();
  }
  
  return messages;
}

/**
 * Get fallback message when Claude API fails
 */
function getFallbackMessage(error) {
  if (error.status === 429) {
    return "I'm receiving many messages right now. Please try again in a minute.";
  }
  
  if (error.status === 500 || error.status === 503) {
    return "I'm having a brief technical issue. Please send your message again in a moment.";
  }
  
  return "I couldn't process your message. Please try again. If this continues, contact support.";
}

/**
 * Generate a proactive check-in message
 * Used for scheduled daily messages
 */
async function generateDailyCheckin(user, additionalContext = {}) {
  try {
    const systemPrompt = getSystemPrompt(user, additionalContext);
    
    // Create a prompt for daily check-in
    const checkinPrompt = getDailyCheckinPrompt(user);
    
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: 300, // Shorter for daily messages
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: checkinPrompt
      }]
    });
    
    return response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
  } catch (error) {
    console.error('❌ Daily check-in generation failed:', error.message);
    return getStaticDailyMessage(user);
  }
}

/**
 * Get prompt for generating daily check-in
 */
function getDailyCheckinPrompt(user) {
  const { current_day, current_phase, name } = user;
  
  // Special day prompts
  if (current_day === 1) {
    return `Generate a warm, encouraging Day 1 welcome message for ${name}. Remind them of their eating window and what to expect on day 1. Keep it short (2-3 sentences max).`;
  }
  
  if (current_day === 30) {
    return `Generate a celebratory Phase 1 completion message for ${name}. Ask them to take their measurements (weight, waist, glucose if possible). Congratulate them and prepare them for Phase 2.`;
  }
  
  if (current_day === 60) {
    return `Generate a celebratory Phase 2 completion message for ${name}. Ask for measurements. They're entering the final phase!`;
  }
  
  if (current_day === 90) {
    return `Generate a graduation message for ${name}! This is their final day. Celebrate their achievement, ask for final measurements, and discuss what comes next.`;
  }
  
  // Regular daily message
  return `Generate a brief morning check-in for ${name} on Day ${current_day} of 90, Phase ${current_phase}. Ask how yesterday went. Keep it to 1-2 sentences. Be warm but concise.`;
}

/**
 * Static fallback messages if Claude fails
 */
function getStaticDailyMessage(user) {
  const { current_day, name } = user;
  
  if (current_day === 1) {
    return `Good morning ${name}! Welcome to Day 1 of your Freedom Protocol. Remember: water, black coffee, or plain tea only until your eating window. You've got this! 💪`;
  }
  
  if (current_day === 30) {
    return `${name}, congratulations! 🎉 You've completed Phase 1! Time to take your measurements — weight, waist, and glucose if you have a meter. How do you feel compared to Day 1?`;
  }
  
  if (current_day === 60) {
    return `${name}, Phase 2 complete! 🔥 You're in the final stretch. Take your measurements today. How does your body feel compared to when you started?`;
  }
  
  if (current_day === 90) {
    return `${name}, TODAY IS DAY 90! 🏆 You did it! Take your final measurements and if possible, get an HbA1c test this week. I'm proud of you. How do you feel?`;
  }
  
  return `Good morning ${name}. Day ${current_day} of 90. How did yesterday go?`;
}

module.exports = {
  getCoachResponse,
  generateDailyCheckin
};

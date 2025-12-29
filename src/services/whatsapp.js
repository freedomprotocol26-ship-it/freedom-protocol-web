/**
 * WhatsApp Cloud API Service
 * 
 * Handles all interactions with Meta's WhatsApp Cloud API.
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const axios = require('axios');
const config = require('../config');

/**
 * Send a text message via WhatsApp
 * 
 * @param {string} to - Recipient phone number (with country code, no +)
 * @param {string} text - Message text
 * @returns {Promise<Object>} API response
 */
async function sendTextMessage(to, text) {
  try {
    // Clean phone number (remove + if present)
    const phoneNumber = to.replace(/^\+/, '');
    
    const response = await axios.post(
      config.whatsapp.apiUrl,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp message sent to ${phoneNumber}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ WhatsApp send error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a message with quick reply buttons
 * Useful for yes/no questions or multiple choice
 * 
 * @param {string} to - Recipient phone number
 * @param {string} bodyText - Message body
 * @param {Array} buttons - Array of {id, title} objects (max 3)
 */
async function sendButtonMessage(to, bodyText, buttons) {
  try {
    const phoneNumber = to.replace(/^\+/, '');
    
    // WhatsApp allows max 3 buttons, each with max 20 char title
    const formattedButtons = buttons.slice(0, 3).map(btn => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.substring(0, 20)
      }
    }));
    
    const response = await axios.post(
      config.whatsapp.apiUrl,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText
          },
          action: {
            buttons: formattedButtons
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp button message sent to ${phoneNumber}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ WhatsApp button message error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a list message (for menus with more options)
 * 
 * @param {string} to - Recipient phone number
 * @param {string} bodyText - Message body
 * @param {string} buttonText - Text on the list button
 * @param {Array} sections - Array of section objects
 */
async function sendListMessage(to, bodyText, buttonText, sections) {
  try {
    const phoneNumber = to.replace(/^\+/, '');
    
    const response = await axios.post(
      config.whatsapp.apiUrl,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: bodyText
          },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ WhatsApp list message sent to ${phoneNumber}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ WhatsApp list message error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mark a message as read
 * Shows the blue checkmarks to the user
 * 
 * @param {string} messageId - WhatsApp message ID
 */
async function markAsRead(messageId) {
  try {
    await axios.post(
      config.whatsapp.apiUrl,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Message ${messageId} marked as read`);
    
  } catch (error) {
    // Don't throw - marking as read is not critical
    console.warn('⚠️ Could not mark message as read:', error.message);
  }
}

/**
 * Extract message data from webhook payload
 * 
 * @param {Object} body - Webhook request body
 * @returns {Object|null} Extracted message data or null
 */
function extractMessageFromWebhook(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Check if this is a message (not a status update)
    if (!value?.messages?.[0]) {
      return null;
    }
    
    const message = value.messages[0];
    const contact = value.contacts?.[0];
    
    // Handle different message types
    let content = null;
    let type = message.type;
    
    switch (message.type) {
      case 'text':
        content = message.text.body;
        break;
      case 'interactive':
        // Button or list reply
        if (message.interactive.type === 'button_reply') {
          content = message.interactive.button_reply.title;
          type = 'button_reply';
        } else if (message.interactive.type === 'list_reply') {
          content = message.interactive.list_reply.title;
          type = 'list_reply';
        }
        break;
      case 'image':
      case 'audio':
      case 'video':
      case 'document':
        // Media messages - we'll handle text only for now
        content = `[${message.type} message received]`;
        break;
      default:
        content = `[${message.type} message]`;
    }
    
    return {
      messageId: message.id,
      phone: message.from,
      content: content,
      type: type,
      timestamp: message.timestamp,
      name: contact?.profile?.name || null
    };
    
  } catch (error) {
    console.error('❌ Error extracting message:', error.message);
    return null;
  }
}

/**
 * Verify webhook signature (for security)
 * Meta sends a signature header that we should verify
 * 
 * @param {string} signature - X-Hub-Signature-256 header
 * @param {string} body - Raw request body
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(signature, body) {
  // For production, implement proper signature verification
  // using crypto.createHmac with your app secret
  // For now, we'll skip this in development
  if (config.nodeEnv === 'development') {
    return true;
  }
  
  // TODO: Implement proper signature verification
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
  //   .update(body)
  //   .digest('hex');
  // return signature === `sha256=${expectedSignature}`;
  
  return true;
}

module.exports = {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  markAsRead,
  extractMessageFromWebhook,
  verifyWebhookSignature
};

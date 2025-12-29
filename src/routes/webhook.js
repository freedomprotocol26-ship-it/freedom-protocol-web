/**
 * WhatsApp Webhook Routes
 * 
 * Handles:
 * 1. Webhook verification (GET) - Required by Meta
 * 2. Incoming messages (POST) - Where the magic happens
 */

const express = require('express');
const router = express.Router();
const config = require('../config');

// Services
const { getCoachResponse } = require('../services/claude');
const { 
  sendTextMessage, 
  markAsRead, 
  extractMessageFromWebhook 
} = require('../services/whatsapp');
const { calculateProgress } = require('../services/protocol');

// Database
const { 
  getUserByPhone, 
  saveMessage, 
  getRecentMessages,
  getRecentLogs,
  updateUserProgress
} = require('../db/queries');

/**
 * GET /webhook
 * 
 * Meta requires this endpoint for webhook verification.
 * When you set up the webhook in Meta dashboard, they send a GET request
 * with a challenge that you must echo back.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔐 Webhook verification request received');
  
  // Check if mode and token are correct
  if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * 
 * This is where WhatsApp sends incoming messages.
 * We process the message, get a response from Claude, and reply.
 */
router.post('/webhook', async (req, res) => {
  try {
    // Always respond 200 quickly to acknowledge receipt
    // WhatsApp will retry if we don't respond in time
    res.sendStatus(200);
    
    // Extract message from webhook payload
    const messageData = extractMessageFromWebhook(req.body);
    
    if (!messageData) {
      // Not a message (could be a status update, etc.)
      return;
    }
    
    const { messageId, phone, content, type, name } = messageData;
    
    console.log(`\n📩 Message from ${phone}: "${content}"`);
    
    // Mark message as read (shows blue checkmarks)
    await markAsRead(messageId);
    
    // Get or create user
    let user = await getUserByPhone(phone);
    
    if (!user) {
      // New user - send registration prompt
      await sendTextMessage(
        phone,
        `Welcome! 👋 I'm the Freedom Protocol Coach.\n\nTo start your 90-day journey to better health, please register first:\n${config.app.onboardingUrl}\n\nOnce registered, message me and we'll begin!`
      );
      return;
    }
    
    // Check if user has started the protocol
    if (user.status === 'pending') {
      // Check subscription status first
      if (user.subscription_status !== 'active') {
        // Need to pay first
        const { createPaymentLink } = require('../services/paystack');
        
        try {
          const payment = await createPaymentLink(user, 'basic');
          
          await sendTextMessage(
            phone,
            `Hi ${user.name}! 👋\n\nTo start your 90-day Freedom Protocol journey, please complete your subscription:\n\n💰 Freedom Basic: ${payment.currency} ${payment.amount}\n\n✅ Full 90-day program\n✅ Daily AI coaching via WhatsApp\n✅ Personalized meal guidance\n✅ Progress tracking\n\n👉 Pay here: ${payment.authorization_url}\n\nOnce payment is confirmed, reply "START" to begin!`
          );
        } catch (error) {
          console.error('Payment link creation failed:', error);
          await sendTextMessage(
            phone,
            `Hi ${user.name}! There was an issue creating your payment link. Please try again later or contact support.`
          );
        }
        return;
      }
      
      // Has subscription but hasn't started
      await sendTextMessage(
        phone,
        `Hi ${user.name}! Your subscription is active. 🎉\n\nReply "START" when you're ready to begin Day 1 of your Freedom Protocol journey.`
      );
      
      // Check if they said START
      if (content.toLowerCase().trim() === 'start') {
        const { startUserProtocol } = require('../db/queries');
        user = await startUserProtocol(user.id);
        
        await sendTextMessage(
          phone,
          `🎉 Let's go, ${user.name}!\n\nToday is Day 1 of your Freedom Protocol.\n\nYour eating window: ${formatTime(user.eating_window_start)} to ${formatTime(user.eating_window_end)}\n\nUntil then: water, black coffee, or plain tea only.\n\nHow are you feeling about starting?`
        );
      }
      return;
    }
    
    // Check if subscription has expired
    if (user.subscription_status === 'active' && user.subscription_end) {
      const endDate = new Date(user.subscription_end);
      if (endDate < new Date()) {
        // Subscription expired
        const { createPaymentLink } = require('../services/paystack');
        
        try {
          const payment = await createPaymentLink(user, 'basic');
          
          await sendTextMessage(
            phone,
            `Hi ${user.name}, your subscription has expired.\n\nTo continue your Freedom Protocol journey, please renew:\n\n👉 ${payment.authorization_url}\n\nYour progress is saved and waiting for you!`
          );
        } catch (error) {
          await sendTextMessage(
            phone,
            `Hi ${user.name}, your subscription has expired. Please contact support to renew.`
          );
        }
        return;
      }
    }
    
    // Check if protocol is complete
    if (user.status === 'completed') {
      await handleCompletedUser(user, phone, content);
      return;
    }
    
    // Check for report sharing commands
    const reportMatch = await checkForReportCommand(user, content);
    if (reportMatch.isReportCommand) {
      await handleReportCommand(user, phone, content, reportMatch);
      return;
    }
    
    // Update user's day/phase/week if needed
    user = await updateUserProgress(user.id);
    
    // Save incoming message
    await saveMessage(user.id, 'inbound', content, messageId);
    
    // Get context for Claude
    const recentMessages = await getRecentMessages(user.id, 10);
    const recentLogs = await getRecentLogs(user.id, 7);
    
    // Get response from Claude
    const response = await getCoachResponse(
      user,
      content,
      recentMessages,
      { recentLogs }
    );
    
    // Save outgoing message
    await saveMessage(user.id, 'outbound', response);
    
    // Send response via WhatsApp
    await sendTextMessage(phone, response);
    
    console.log(`✅ Response sent to ${user.name}`);
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Don't send error message to user to avoid loops
    // Log for debugging
  }
});

/**
 * Handle messages from users who completed the protocol
 */
async function handleCompletedUser(user, phone, content) {
  // They can still chat, but we remind them they've graduated
  const { getCoachResponse } = require('../services/claude');
  const { saveMessage, getRecentMessages } = require('../db/queries');
  
  // Save message
  await saveMessage(user.id, 'inbound', content);
  
  // Get context
  const recentMessages = await getRecentMessages(user.id, 10);
  
  // Modify user context to indicate they're in maintenance
  const maintenanceUser = {
    ...user,
    current_day: 'Maintenance',
    current_phase: 'Graduate'
  };
  
  const response = await getCoachResponse(
    maintenanceUser,
    content,
    recentMessages,
    { isGraduate: true }
  );
  
  await saveMessage(user.id, 'outbound', response);
  await sendTextMessage(phone, response);
}

/**
 * Format time for display
 */
function formatTime(time) {
  if (!time) return '12:00 PM';
  const [hours, minutes] = time.toString().split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

/**
 * Check if message is a report sharing command
 */
async function checkForReportCommand(user, content) {
  const lowerContent = content.toLowerCase();
  
  // Keywords that indicate report sharing intent
  const reportKeywords = [
    'send report', 'share report', 'send my report',
    'share progress', 'send progress', 'share my progress',
    'send to doctor', 'send to my doctor', 'share with doctor',
    'send to caregiver', 'share with caregiver',
    'send update to', 'share update with',
    'send summary', 'share summary'
  ];
  
  const isReportCommand = reportKeywords.some(keyword => lowerContent.includes(keyword));
  
  // Try to extract recipient info from message
  let recipientInfo = null;
  
  // Pattern: "send report to Dr. Mensah" or "share with my wife"
  const toMatch = content.match(/(?:send|share).*(?:to|with)\s+(?:my\s+)?(.+)/i);
  if (toMatch) {
    recipientInfo = toMatch[1].trim();
  }
  
  return {
    isReportCommand,
    recipientInfo
  };
}

/**
 * Handle report sharing command
 */
async function handleReportCommand(user, phone, content, reportMatch) {
  const { createReport, getUserCaregivers, addCaregiver } = require('../services/report');
  const { getUserProgressSummary, getRecentLogs, getWeeklyMeasurements } = require('../db/queries');
  
  try {
    // Get user's saved caregivers
    const caregivers = await getUserCaregivers(user.id);
    
    // Check if we're in the middle of adding a caregiver
    const recentMessages = await getRecentMessages(user.id, 5);
    const awaitingCaregiverInfo = recentMessages.some(m => 
      m.direction === 'outbound' && 
      m.content.includes('WhatsApp number') &&
      m.content.includes('country code')
    );
    
    // If user is providing caregiver details
    if (awaitingCaregiverInfo) {
      // Try to parse caregiver info from message
      const phoneMatch = content.match(/\d{10,15}/);
      
      if (phoneMatch) {
        // Extract phone number
        const caregiverPhone = phoneMatch[0];
        
        // Try to extract name (anything before the number or after "name:")
        let caregiverName = 'Caregiver';
        const nameMatch = content.match(/(?:name[:\s]+)?([A-Za-z\s\.]+?)(?:\s+\d|$)/i);
        if (nameMatch) {
          caregiverName = nameMatch[1].trim();
        }
        
        // Save caregiver
        await addCaregiver(user.id, {
          phone: caregiverPhone,
          name: caregiverName,
          role: 'caregiver'
        });
        
        // Generate and send report
        await generateAndSendReport(user, caregiverPhone, caregiverName);
        
        await sendTextMessage(
          phone,
          `✅ Report sent to ${caregiverName}!\n\nThey'll receive a secure link on WhatsApp that's valid for 72 hours.\n\nI've saved ${caregiverName} so you can easily share future reports.`
        );
        return;
      }
    }
    
    // If user has saved caregivers
    if (caregivers.length > 0) {
      // Check if they specified which one
      const specifiedCaregiver = caregivers.find(c => 
        content.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (specifiedCaregiver) {
        // Send to specified caregiver
        await generateAndSendReport(user, specifiedCaregiver.phone, specifiedCaregiver.name);
        
        await sendTextMessage(
          phone,
          `✅ Report sent to ${specifiedCaregiver.name}!\n\nThey'll receive a secure link valid for 72 hours.`
        );
        return;
      }
      
      // Ask which caregiver
      const caregiverList = caregivers.map((c, i) => `${i + 1}. ${c.name} (${c.role})`).join('\n');
      
      await sendTextMessage(
        phone,
        `Who should I send your progress report to?\n\n${caregiverList}\n\nOr provide a new contact's WhatsApp number.`
      );
      return;
    }
    
    // No caregivers saved - ask for details
    await sendTextMessage(
      phone,
      `I can send your progress report to a doctor, caregiver, or family member.\n\nPlease provide their:\n• Name\n• WhatsApp number (with country code, e.g., 233241234567)\n\nExample: "Dr. Mensah 233241234567"`
    );
    
  } catch (error) {
    console.error('Report command error:', error);
    await sendTextMessage(
      phone,
      `Sorry, I couldn't process that. Please try again or say "send report to [name] [phone number]".`
    );
  }
}

/**
 * Generate and send report to caregiver
 */
async function generateAndSendReport(user, caregiverPhone, caregiverName) {
  const { createReport } = require('../services/report');
  const { getRecentLogs, getWeeklyMeasurements } = require('../db/queries');
  const { calculateCompliance } = require('../services/protocol');
  
  // Gather progress data
  const recentLogs = await getRecentLogs(user.id, 14);
  const measurements = await getWeeklyMeasurements(user.id);
  
  const progressData = {
    current_day: user.current_day,
    current_phase: user.current_phase,
    current_week: user.current_week,
    recentLogs,
    measurements,
    fastingCompliance: calculateCompliance(recentLogs.slice(0, 7), 'fasting'),
    exerciseCompliance: calculateCompliance(recentLogs.slice(0, 7), 'exercise')
  };
  
  // Create the report
  const report = await createReport(user, progressData, {
    recipientPhone: caregiverPhone,
    recipientName: caregiverName,
    recipientRole: 'caregiver',
    expiresInHours: 72
  });
  
  // Send to caregiver via WhatsApp
  await sendTextMessage(
    caregiverPhone,
    `Hello ${caregiverName},\n\n${user.name} has shared their Freedom Protocol progress report with you.\n\n📊 View Report:\n${report.url}\n\n⏰ This link expires in 72 hours.\n\n—\nFreedom Protocol\n90-Day Diabetes Management Program`
  );
  
  return report;
}

module.exports = router;

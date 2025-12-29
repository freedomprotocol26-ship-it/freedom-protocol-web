/**
 * Daily Check-in Scheduler
 * 
 * Sends proactive morning messages to active users.
 * This keeps users engaged and on track.
 */

const cron = require('node-cron');
const { getActiveUsers, updateUserProgress, getTodayMessages } = require('../db/queries');
const { sendTextMessage } = require('../services/whatsapp');
const { generateDailyCheckin } = require('../services/claude');
const { getMilestone, getWeekFocus } = require('../services/protocol');

/**
 * Start the daily check-in scheduler
 */
function startScheduler() {
  console.log('⏰ Starting daily check-in scheduler...');
  
  // Run every day at 6:00 AM (adjust timezone as needed)
  // Cron format: minute hour day month weekday
  cron.schedule('0 6 * * *', async () => {
    console.log('\n🌅 Running daily check-ins...');
    await sendDailyCheckins();
  }, {
    timezone: 'Africa/Accra' // Ghana timezone
  });
  
  // Also run a mid-day reminder at 11:30 AM for users who haven't responded
  cron.schedule('30 11 * * *', async () => {
    console.log('\n☀️ Running mid-day reminders...');
    await sendMidDayReminders();
  }, {
    timezone: 'Africa/Accra'
  });
  
  // Evening check-in at 7:00 PM
  cron.schedule('0 19 * * *', async () => {
    console.log('\n🌙 Running evening check-ins...');
    await sendEveningCheckins();
  }, {
    timezone: 'Africa/Accra'
  });
  
  console.log('✅ Scheduler started (times in Africa/Accra timezone)');
  console.log('   - Morning check-in: 6:00 AM');
  console.log('   - Mid-day reminder: 11:30 AM');
  console.log('   - Evening check-in: 7:00 PM');
}

/**
 * Send morning check-ins to all active users
 */
async function sendDailyCheckins() {
  try {
    const users = await getActiveUsers();
    console.log(`📤 Sending check-ins to ${users.length} active users`);
    
    for (const user of users) {
      try {
        // Update user's progress (day/phase/week)
        const updatedUser = await updateUserProgress(user.id);
        
        // Generate personalized message
        const message = await generateDailyCheckin(updatedUser);
        
        // Send via WhatsApp
        await sendTextMessage(user.phone, message);
        
        console.log(`✅ Check-in sent to ${user.name} (Day ${updatedUser.current_day})`);
        
        // Small delay to avoid rate limiting
        await sleep(1000);
        
      } catch (error) {
        console.error(`❌ Failed to send check-in to ${user.name}:`, error.message);
      }
    }
    
    console.log('✅ Daily check-ins complete');
    
  } catch (error) {
    console.error('❌ Daily check-in scheduler error:', error);
  }
}

/**
 * Send mid-day reminders
 * Focus on fasting window and encouragement
 */
async function sendMidDayReminders() {
  try {
    const users = await getActiveUsers();
    
    for (const user of users) {
      try {
        // Only send if they haven't messaged today
        const todayMessages = await getTodayMessages(user.id);
        
        // If no messages from them today, send a gentle reminder
        const hasUserMessage = todayMessages.some(m => m.direction === 'inbound');
        
        if (!hasUserMessage && Math.random() < 0.5) { // 50% chance to avoid being too pushy
          const message = getMidDayMessage(user);
          await sendTextMessage(user.phone, message);
          console.log(`📤 Mid-day reminder sent to ${user.name}`);
        }
        
        await sleep(500);
        
      } catch (error) {
        console.error(`❌ Failed mid-day reminder for ${user.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Mid-day reminder error:', error);
  }
}

/**
 * Send evening check-ins
 * Focus on reflection and next day prep
 */
async function sendEveningCheckins() {
  try {
    const users = await getActiveUsers();
    
    for (const user of users) {
      try {
        // Only send on certain milestone days or randomly
        const isMilestoneDay = getMilestone(user.current_day) !== null;
        const shouldSend = isMilestoneDay || Math.random() < 0.3; // 30% chance on normal days
        
        if (shouldSend) {
          const message = getEveningMessage(user);
          await sendTextMessage(user.phone, message);
          console.log(`🌙 Evening check-in sent to ${user.name}`);
        }
        
        await sleep(500);
        
      } catch (error) {
        console.error(`❌ Failed evening check-in for ${user.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Evening check-in error:', error);
  }
}

/**
 * Get mid-day message based on user's phase
 */
function getMidDayMessage(user) {
  const { current_day, current_phase, name, eating_window_start } = user;
  
  const messages = [
    `Quick check ${name} — how's your fasting going today? Eating window opens at ${formatTime(eating_window_start)}.`,
    `${name}, staying strong? Water and black coffee are your friends until ${formatTime(eating_window_start)}. 💪`,
    `Hope you're doing well ${name}. Day ${current_day} is another step forward. How are you feeling?`,
  ];
  
  // Add phase-specific messages
  if (current_phase === 1 && current_day <= 7) {
    return `${name}, first week can be tough. Hunger comes in waves — it will pass. Drink some water. You're doing great.`;
  }
  
  if (current_phase === 2) {
    return `${name}, Phase 2 warrior! How's the 18:6 treating you today?`;
  }
  
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get evening message
 */
function getEveningMessage(user) {
  const { current_day, name } = user;
  const milestone = getMilestone(current_day);
  
  if (milestone) {
    return `${name}, ${milestone.message} How did Day ${current_day} go for you?`;
  }
  
  const messages = [
    `Evening ${name}. How was Day ${current_day}? Did you hit your fasting window?`,
    `${name}, winding down Day ${current_day}. What did you eat during your window today?`,
    `End of Day ${current_day} ${name}. Quick reflection — what went well today?`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
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
 * Helper sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Manual trigger for testing
 */
async function triggerDailyCheckins() {
  console.log('🧪 Manually triggering daily check-ins...');
  await sendDailyCheckins();
}

module.exports = {
  startScheduler,
  triggerDailyCheckins,
  sendDailyCheckins,
  sendMidDayReminders,
  sendEveningCheckins
};

/**
 * Freedom Protocol - Main Entry Point
 * 
 * 90-day diabetes reversal coaching app powered by Claude AI
 * 
 * Created by Patrick
 */

const express = require('express');
const config = require('./config');

// Import routes
const webhookRoutes = require('./routes/webhook');
const paymentRoutes = require('./routes/payment');
const reportRoutes = require('./routes/report');

// Import scheduler
const { startScheduler } = require('./scheduler/daily-checkin');

// Initialize Express app
const app = express();

// ===========================================
// MIDDLEWARE
// ===========================================

// Parse JSON bodies (WhatsApp sends JSON)
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ===========================================
// ROUTES
// ===========================================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Freedom Protocol',
    version: '1.0.0',
    status: 'running',
    description: '90-day diabetes reversal coaching powered by Claude AI'
  });
});

// Health check for hosting platforms
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// WhatsApp webhook routes
app.use('/', webhookRoutes);

// Payment routes (Paystack)
app.use('/', paymentRoutes);

// Report routes (caregiver sharing)
app.use('/', reportRoutes);

// Serve static files (onboarding form)
app.use(express.static('public'));

// ===========================================
// API ROUTES (for onboarding form)
// ===========================================

// Create new user (called from onboarding form)
app.post('/api/users', async (req, res) => {
  try {
    const { createUser } = require('./db/queries');
    const user = await createUser(req.body);
    
    res.json({ 
      success: true, 
      message: 'Registration successful! Open WhatsApp and message us to begin.',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    
    if (error.code === '23505') { // Unique violation (phone already exists)
      res.status(400).json({ 
        success: false, 
        message: 'This phone number is already registered.' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Registration failed. Please try again.' 
      });
    }
  }
});

// Get user progress (for dashboard, if you build one later)
app.get('/api/users/:phone/progress', async (req, res) => {
  try {
    const { getUserByPhone, getRecentLogs, getWeeklyMeasurements } = require('./db/queries');
    const { generateProgressSummary } = require('./services/protocol');
    
    const user = await getUserByPhone(req.params.phone);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const logs = await getRecentLogs(user.id, 30);
    const measurements = await getWeeklyMeasurements(user.id);
    const summary = generateProgressSummary(user, logs, measurements);
    
    res.json({ success: true, progress: summary });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch progress' });
  }
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ===========================================
// START SERVER
// ===========================================

async function startServer() {
  try {
    // Test database connection
    const { pool } = require('./db');
    await pool.query('SELECT 1');
    console.log('✅ Database connection verified');
    
    // Start the scheduler for daily check-ins
    startScheduler();
    
    // Start listening
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏃 FREEDOM PROTOCOL SERVER RUNNING                       ║
║                                                            ║
║   Port: ${config.port}                                            ║
║   Environment: ${config.nodeEnv.padEnd(30)}        ║
║                                                            ║
║   Endpoints:                                               ║
║   - GET  /           Health check                          ║
║   - GET  /webhook    WhatsApp verification                 ║
║   - POST /webhook    WhatsApp messages                     ║
║   - POST /api/users  User registration                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  const { pool } = require('./db');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  const { pool } = require('./db');
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDb } = require('./db/init');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const protocolRoutes = require('./routes/protocol');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Middleware
// ========================
app.use(cors());
app.use(express.json());

// ========================
// API ROUTES (FIRST)
// ========================
app.use(authRoutes);
app.use(chatRoutes);
app.use(protocolRoutes);

// ========================
// STATIC FRONTEND (LAST)
// ========================
app.use(express.static(path.join(__dirname, '../public')));

// ========================
// Start server
// ========================
async function startServer() {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  Freedom Protocol Server Running           ║
║  Port: ${PORT}                                  ║
║  Status: Ready ✅                           ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

const { pool } = require('./index');

async function initDb() {
  try {
    console.log('🔧 Initializing database...');

    // Simple connectivity test
    await pool.query('SELECT 1');

    console.log('✅ Database connected');

    // You already have schema files, so we DO NOT recreate tables here
    // This function is now PURELY a startup check

    console.log('✅ Database ready');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    throw err;
  }
}

module.exports = { initDb };

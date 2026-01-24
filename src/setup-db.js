const { pool } = require('./db');

async function setupDatabase() {
    try {
        // Create glucose_readings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS glucose_readings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                glucose_level DECIMAL(5,2) NOT NULL,
                measured_at TIMESTAMP NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Database tables ready');
    } catch (error) {
        console.error('❌ Database setup error:', error);
        throw error;
    }
}

module.exports = { setupDatabase };

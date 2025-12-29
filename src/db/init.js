/**
 * Database Initialization Script
 * 
 * Run this once to create all required tables:
 *   npm run db:init
 * 
 * This script is idempotent - safe to run multiple times.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const schema = `
-- =============================================
-- FREEDOM PROTOCOL DATABASE SCHEMA
-- =============================================

-- Users table: stores all user information
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Ghana',
    
    -- Health baseline (from onboarding)
    has_diabetes BOOLEAN DEFAULT FALSE,
    diabetes_type VARCHAR(20), -- 'type2', 'prediabetes', 'unsure'
    on_medication BOOLEAN DEFAULT FALSE,
    medications TEXT,
    has_glucometer BOOLEAN DEFAULT FALSE,
    starting_weight DECIMAL(5,2),
    starting_waist DECIMAL(5,2),
    starting_glucose DECIMAL(5,2),
    
    -- Daily schedule
    wake_time TIME DEFAULT '06:00',
    sleep_time TIME DEFAULT '22:00',
    eating_window_start TIME DEFAULT '12:00',
    eating_window_end TIME DEFAULT '20:00',
    exercises_regularly BOOLEAN DEFAULT FALSE,
    
    -- Motivation (from onboarding)
    why_starting TEXT,
    biggest_challenge TEXT,
    
    -- Subscription & Payment
    subscription_status VARCHAR(20) DEFAULT 'none', -- none, pending, active, expired, cancelled
    subscription_plan VARCHAR(20), -- basic, plus
    subscription_start TIMESTAMP WITH TIME ZONE,
    subscription_end TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),
    
    -- Protocol tracking
    start_date DATE,
    current_day INTEGER DEFAULT 0,
    current_phase INTEGER DEFAULT 1,
    current_week INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, paused, completed, dropped
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table: tracks all payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reference VARCHAR(100) UNIQUE NOT NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    plan VARCHAR(20), -- basic, plus
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, refunded
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Paystack data
    paystack_reference VARCHAR(100),
    paystack_access_code VARCHAR(100),
    channel VARCHAR(50), -- card, mobile_money, bank
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily logs: tracks daily progress
CREATE TABLE IF NOT EXISTS daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    protocol_day INTEGER,
    
    -- Fasting tracking
    fasting_start TIME,
    fasting_end TIME,
    fasting_hours DECIMAL(4,2),
    broke_fast_early BOOLEAN DEFAULT FALSE,
    break_reason TEXT,
    
    -- Measurements (optional daily)
    glucose_reading DECIMAL(5,2),
    weight DECIMAL(5,2),
    waist DECIMAL(5,2),
    
    -- Exercise
    exercised BOOLEAN DEFAULT FALSE,
    exercise_type VARCHAR(100),
    exercise_duration INTEGER, -- minutes
    
    -- Subjective ratings (1-5)
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 5),
    mood INTEGER CHECK (mood BETWEEN 1 AND 5),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    
    -- Notes
    notes TEXT,
    foods_eaten TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One log per user per day
    UNIQUE(user_id, log_date)
);

-- Messages: conversation history for context
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, voice, etc.
    whatsapp_message_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly measurements: formal weekly check-ins
CREATE TABLE IF NOT EXISTS weekly_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    phase INTEGER NOT NULL,
    measurement_date DATE NOT NULL,
    
    -- Measurements
    weight DECIMAL(5,2),
    waist DECIMAL(5,2),
    glucose DECIMAL(5,2),
    
    -- Progress from baseline
    weight_change DECIMAL(5,2),
    waist_change DECIMAL(5,2),
    glucose_change DECIMAL(5,2),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, week_number)
);

-- Phase completions: track phase transitions
CREATE TABLE IF NOT EXISTS phase_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Measurements at phase completion
    weight DECIMAL(5,2),
    waist DECIMAL(5,2),
    glucose DECIMAL(5,2),
    
    -- Compliance metrics
    days_completed INTEGER,
    fasting_compliance_percent DECIMAL(5,2),
    exercise_compliance_percent DECIMAL(5,2),
    
    notes TEXT,
    
    UNIQUE(user_id, phase)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Caregivers table: stores doctors/family members who can receive reports
CREATE TABLE IF NOT EXISTS caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'caregiver', -- doctor, caregiver, family
    relationship VARCHAR(50), -- e.g., "Primary Doctor", "Spouse", "Daughter"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, phone)
);

-- Shared reports table: stores generated reports
CREATE TABLE IF NOT EXISTS shared_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    
    -- Recipient info
    recipient_phone VARCHAR(20),
    recipient_name VARCHAR(100),
    recipient_role VARCHAR(20), -- doctor, caregiver, family
    
    -- Report content
    report_content TEXT NOT NULL,
    
    -- Access tracking
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report audit log: tracks all report access
CREATE TABLE IF NOT EXISTS report_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES shared_reports(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- created, viewed, expired
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_caregivers_user ON caregivers(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_token ON shared_reports(token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_user ON shared_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_report ON report_audit_log(report_id);

-- =============================================
-- INITIAL DATA / SEED (Optional)
-- =============================================

-- You can add test users here for development
-- INSERT INTO users (phone, name, country, status) 
-- VALUES ('+233200000000', 'Test User', 'Ghana', 'active')
-- ON CONFLICT (phone) DO NOTHING;
`;

async function initializeDatabase() {
  console.log('🔧 Initializing database...\n');
  
  try {
    await pool.query(schema);
    console.log('✅ Database schema created successfully!\n');
    
    // Show created tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables created:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
initializeDatabase()
  .then(() => {
    console.log('\n✅ Database initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

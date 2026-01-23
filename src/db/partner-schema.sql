-- Partners table (doctors, nurses, care coordinators)
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    license_type VARCHAR(50) NOT NULL, -- 'doctor', 'senior_nurse', 'care_coordinator'
    specialty VARCHAR(100),
    facility_name VARCHAR(255),
    facility_address TEXT,
    years_experience INTEGER,
    
    -- Application status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    application_date TIMESTAMP DEFAULT NOW(),
    reviewed_date TIMESTAMP,
    reviewed_by VARCHAR(255),
    rejection_reason TEXT,
    
    -- Login credentials (created after approval)
    password_hash VARCHAR(255),
    
    -- Commission tracking
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- percentage
    total_referrals INTEGER DEFAULT 0,
    active_patients INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Partner activity log
CREATE TABLE IF NOT EXISTS partner_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id),
    activity_type VARCHAR(50) NOT NULL, -- 'application', 'approval', 'rejection', 'patient_referral', etc.
    description TEXT,
    performed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_email ON partners(email);
CREATE INDEX idx_partner_activity_partner_id ON partner_activity_log(partner_id);

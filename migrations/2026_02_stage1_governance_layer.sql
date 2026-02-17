-- ============================================================
-- FREEDOM PROTOCOL
-- Stage 1 Governance Layer
-- February 2026
-- ============================================================

-- ------------------------------------------------------------
-- 1. Role Constraint Update
-- ------------------------------------------------------------

ALTER TABLE users
DROP CONSTRAINT IF EXISTS valid_roles;

ALTER TABLE users
ADD CONSTRAINT valid_roles
CHECK (role IN ('patient', 'doctor', 'admin', 'superadmin', 'care_coordinator'));

-- ------------------------------------------------------------
-- 2. Care Coordinator Structure
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS patient_care_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  coordinator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS doctor_care_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coordinator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- ------------------------------------------------------------
-- 3. Daily Report Audit Fields
-- ------------------------------------------------------------

ALTER TABLE patient_daily_reports
ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES users(id);

ALTER TABLE patient_daily_reports
ADD COLUMN IF NOT EXISTS entry_source TEXT DEFAULT 'self';

-- ------------------------------------------------------------
-- 4. Coordinator Escalation Flags
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS coordinator_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  coordinator_id UUID REFERENCES users(id),
  message TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'urgent')),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. Protocol Phase Enhancements
-- ------------------------------------------------------------

ALTER TABLE protocol_phases
ADD COLUMN IF NOT EXISTS min_days INTEGER;

ALTER TABLE protocol_phases
ADD COLUMN IF NOT EXISTS requires_physician_approval BOOLEAN DEFAULT true;

ALTER TABLE protocol_phases
ADD COLUMN IF NOT EXISTS is_maintenance BOOLEAN DEFAULT false;

-- ------------------------------------------------------------
-- 6. Structured Exit Criteria
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS protocol_exit_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES protocol_phases(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  operator TEXT CHECK (operator IN ('<', '>', '<=', '>=', '=')),
  threshold_value DECIMAL,
  required_consecutive_days INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. Structured Relapse Triggers
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS protocol_relapse_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES protocol_phases(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  operator TEXT CHECK (operator IN ('<', '>', '<=', '>=', '=')),
  threshold_value DECIMAL,
  required_consecutive_days INTEGER DEFAULT 1,
  revert_to_phase INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. Phase Transition Governance
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS phase_transition_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_protocol_id UUID REFERENCES patient_protocols(id) ON DELETE CASCADE,
  from_phase INTEGER NOT NULL,
  to_phase INTEGER NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- End of Stage 1 Governance Layer
-- ============================================================

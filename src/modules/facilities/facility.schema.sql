-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Doctor ↔ Facility junction table
CREATE TABLE IF NOT EXISTS doctor_facilities (
  doctor_id UUID NOT NULL REFERENCES users(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (doctor_id, facility_id)
);

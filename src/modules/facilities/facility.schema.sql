-- Freedom Protocol - Facility Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_facilities (
  doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (doctor_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_facilities_owner_user_id ON facilities(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_facilities_name ON facilities(name);
CREATE INDEX IF NOT EXISTS idx_doctor_facilities_doctor_id ON doctor_facilities(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_facilities_facility_id ON doctor_facilities(facility_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_facility_per_owner
ON facilities(owner_user_id, name);

CREATE OR REPLACE FUNCTION update_facilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_facilities_updated_at
BEFORE UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION update_facilities_updated_at();

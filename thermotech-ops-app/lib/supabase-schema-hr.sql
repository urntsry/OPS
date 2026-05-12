-- =============================================
-- HR SYSTEM: Extended profile fields + tracking
-- =============================================

-- 1. Extend profiles with HR fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS labor_insurance_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_insurance_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contract_expiry DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT '本國';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. HR events log (insurance renewals, contract changes, etc.)
CREATE TABLE IF NOT EXISTS hr_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'hire', 'terminate', 'insurance_renewal', 'contract_renewal', 'note'
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendance records (for CSV import)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  leave_type TEXT,  -- NULL means normal day, otherwise: '特休', '事假', '病假', '公假'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, record_date)
);

-- 4. RLS policies
ALTER TABLE hr_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_events_read_all" ON hr_events FOR SELECT USING (true);
CREATE POLICY "hr_events_insert_admin" ON hr_events FOR INSERT WITH CHECK (true);
CREATE POLICY "hr_events_update_admin" ON hr_events FOR UPDATE USING (true);

CREATE POLICY "attendance_read_all" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT WITH CHECK (true);

-- 5. View: upcoming expirations (next 30 days)
CREATE OR REPLACE VIEW hr_upcoming_expirations AS
SELECT
  p.id,
  p.employee_id,
  p.full_name,
  p.department,
  'labor_insurance' AS expiry_type,
  p.labor_insurance_date AS expiry_date
FROM profiles p
WHERE p.labor_insurance_date IS NOT NULL
  AND p.labor_insurance_date <= CURRENT_DATE + INTERVAL '30 days'
  AND p.is_active = TRUE
UNION ALL
SELECT
  p.id,
  p.employee_id,
  p.full_name,
  p.department,
  'health_insurance' AS expiry_type,
  p.health_insurance_date AS expiry_date
FROM profiles p
WHERE p.health_insurance_date IS NOT NULL
  AND p.health_insurance_date <= CURRENT_DATE + INTERVAL '30 days'
  AND p.is_active = TRUE
UNION ALL
SELECT
  p.id,
  p.employee_id,
  p.full_name,
  p.department,
  'contract' AS expiry_type,
  p.contract_expiry AS expiry_date
FROM profiles p
WHERE p.contract_expiry IS NOT NULL
  AND p.contract_expiry <= CURRENT_DATE + INTERVAL '30 days'
  AND p.is_active = TRUE;

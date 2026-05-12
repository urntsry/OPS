-- =============================================
-- AUTH: bcrypt password hashing with pgcrypto
-- =============================================

-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure password_hash column exists on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Migrate existing plaintext passwords to bcrypt hash
UPDATE profiles
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL AND password != '' AND password_hash IS NULL;

-- 4. Function: set a user's password (hashes before storing)
CREATE OR REPLACE FUNCTION set_user_password(p_employee_id TEXT, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10))
  WHERE employee_id = p_employee_id;
  
  RETURN FOUND;
END;
$$;

-- 5. Function: verify password (returns profile row on success, null on failure)
CREATE OR REPLACE FUNCTION verify_password(p_employee_id TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  employee_id TEXT,
  full_name TEXT,
  department TEXT,
  job_title TEXT,
  role TEXT,
  points_balance INTEGER,
  site_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.employee_id,
    p.full_name,
    p.department,
    p.job_title,
    p.role,
    p.points_balance,
    p.site_code
  FROM profiles p
  WHERE p.employee_id = p_employee_id
    AND p.password_hash = crypt(p_password, p.password_hash);
    
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- 6. After migration is verified, you can drop the old plaintext column:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS password;

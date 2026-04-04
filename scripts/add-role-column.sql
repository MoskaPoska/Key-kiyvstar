-- SQL script to add role column and migrate from is_admin

-- Add role column if it doesn't exist
ALTER TABLE people ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';

-- Migrate existing is_admin values to role
UPDATE people SET role = 'ADMIN' WHERE is_admin = true;
UPDATE people SET role = 'USER' WHERE is_admin = false OR is_admin IS NULL;

-- Verify the changes
SELECT id, name, phone, is_admin, role, plain_password 
FROM people 
ORDER BY name;

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'people' 
ORDER BY ordinal_position;

-- Test the new role system
-- SELECT name, role FROM people WHERE name = 'Администратор';
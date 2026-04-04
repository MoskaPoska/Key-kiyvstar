-- SQL script to fix user roles and permissions

-- Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'people' 
ORDER BY ordinal_position;

-- Add is_admin column if it doesn't exist (should already exist, but just in case)
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Check existing users
SELECT id, name, phone, is_admin, plain_password 
FROM people 
ORDER BY name;

-- Fix admin user role
UPDATE people SET is_admin = true WHERE name = 'Администратор';

-- Fix any other users to have proper roles
-- If you have other users, set their roles accordingly:
-- UPDATE people SET is_admin = false WHERE name = 'Имя_пользователя';

-- Verify the changes
SELECT id, name, phone, is_admin, plain_password 
FROM people 
WHERE name = 'Администратор';

-- Test login with admin user
-- SELECT name, is_admin FROM people WHERE name = 'Администратор' AND password_hash = '$2b$10$...';
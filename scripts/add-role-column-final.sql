-- SQL script to add role column to people table on Railway

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

-- Create admin user if it doesn't exist
INSERT INTO people (name, phone, is_admin, role, password_hash, plain_password) 
VALUES ('Администратор', '+380501234567', true, 'ADMIN', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123')
ON CONFLICT (name) DO NOTHING;

-- Verify admin user was created
SELECT id, name, phone, is_admin, role, plain_password 
FROM people 
WHERE name = 'Администратор';
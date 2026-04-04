-- SQL script to add plain_password column and create admin user

-- Add plain_password column to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT '';

-- Check if admin user exists
-- SELECT * FROM people WHERE name = 'Администратор';

-- If admin user doesn't exist, create it
-- Note: You need to hash the password first or use the following SQL with a hashed password
-- Password 'admin123' hashed with bcrypt: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO people (name, phone, is_admin, password_hash, plain_password) 
VALUES ('Администратор', '+380501234567', true, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123')
ON CONFLICT (name) DO NOTHING;

-- Verify the user was created
SELECT id, name, phone, is_admin, plain_password FROM people WHERE name = 'Администратор';

-- Remove any existing user with this email first
DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM system_users WHERE email = 'clebinhodesign@gmail.com');
DELETE FROM system_users WHERE email = 'clebinhodesign@gmail.com';

-- Insert the user with correct bcrypt hash for 'admin123'
INSERT INTO system_users (agency_id, email, password_hash, name, role, is_active, created_at, updated_at) 
VALUES (1, 'clebinhodesign@gmail.com', '$2b$12$LQv3c1yqBwLFaJGk2FmyNOuiM8h8gY3fP4g4nNtMsHgZqCdTJ9EcK', 'Administrador', 'administrator', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Migration to add 'supervisor' role to system_users table
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we need to recreate the table

-- Create new table with updated constraint
CREATE TABLE system_users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'supervisor', 'collaborator')),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER,
  last_login_at DATETIME
);

-- Copy data from old table to new table
INSERT INTO system_users_new (id, agency_id, email, password_hash, name, role, is_active, created_at, updated_at, created_by_user_id, last_login_at)
SELECT id, agency_id, email, password_hash, name, role, is_active, created_at, updated_at, created_by_user_id, last_login_at
FROM system_users;

-- Drop old table
DROP TABLE system_users;

-- Rename new table to original name
ALTER TABLE system_users_new RENAME TO system_users;

-- Recreate indexes
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_system_users_agency ON system_users(agency_id);

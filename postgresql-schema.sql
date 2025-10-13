-- ============================================================================
-- POSTGRESQL SCHEMA - PAP Sistema
-- Converted from D1/SQLite migrations
-- ============================================================================

-- Agencies table for multi-tenant architecture
CREATE TABLE agencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT true,
  logo_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System users table with email/password authentication
CREATE TABLE system_users (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'supervisor', 'collaborator')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER,
  last_login_at TIMESTAMP
);

-- User sessions table for session management
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cities table for each agency
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  state TEXT DEFAULT 'SC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Professionals table (doctors, psychologists, photo locations, test centers)
CREATE TABLE professionals (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico')),
  city_id INTEGER NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  observations TEXT,
  attendance_type TEXT DEFAULT 'AGENDAMENTO' CHECK (attendance_type IN ('AGENDAMENTO', 'POR ORDEM DE CHEGADA')),
  working_days TEXT,
  working_hours TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Process steps configuration
CREATE TABLE process_steps (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fees/taxes configuration
CREATE TABLE fees (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  linked_professional_type TEXT CHECK (linked_professional_type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step by step processes created by users
CREATE TABLE step_processes (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  city_id INTEGER NOT NULL,
  client_name TEXT,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  show_toxicologico_message BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Selected steps for each process
CREATE TABLE process_selected_steps (
  id SERIAL PRIMARY KEY,
  process_id INTEGER NOT NULL,
  step_id INTEGER NOT NULL,
  professional_id INTEGER,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Selected fees for each process
CREATE TABLE process_selected_fees (
  id SERIAL PRIMARY KEY,
  process_id INTEGER NOT NULL,
  fee_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agency instructions (general and required documents)
CREATE TABLE agency_instructions (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL,
  general_instructions TEXT,
  required_documents TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_system_users_agency ON system_users(agency_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_cities_agency_id ON cities(agency_id);
CREATE INDEX idx_professionals_agency_id ON professionals(agency_id);
CREATE INDEX idx_professionals_city_id ON professionals(city_id);
CREATE INDEX idx_process_steps_agency_id ON process_steps(agency_id);
CREATE INDEX idx_fees_agency_id ON fees(agency_id);
CREATE INDEX idx_step_processes_agency_id ON step_processes(agency_id);
CREATE INDEX idx_step_processes_user_id ON step_processes(user_id);

-- ============================================================================
-- IMPORTANT NOTES:
-- 1. This schema is compatible with PostgreSQL
-- 2. AUTOINCREMENT is replaced with SERIAL
-- 3. DATETIME is replaced with TIMESTAMP  
-- 4. BOOLEAN 0/1 is replaced with true/false
-- 5. CURRENT_TIMESTAMP works in both SQLite and PostgreSQL
-- 6. datetime('now') must be replaced with NOW() in queries
-- ============================================================================

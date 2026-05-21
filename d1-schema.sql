-- ============================================================================
-- SCHEMA PARA CLOUDFLARE D1 (SQLite)
-- Execute este arquivo no Console do Cloudflare D1 ou via Wrangler:
--   npx wrangler d1 execute pap-sistema-producao --file=d1-schema.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  logo_key TEXT
);

CREATE TABLE IF NOT EXISTS system_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER,
  last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  state TEXT DEFAULT 'SC',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  phone TEXT,
  address TEXT,
  observations TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  attendance_type TEXT DEFAULT 'AGENDAMENTO',
  working_days TEXT,
  working_hours TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS process_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_required INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  title TEXT,
  description TEXT,
  obs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  linked_professional_type TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS step_processes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  city_id INTEGER NOT NULL REFERENCES cities(id),
  client_name TEXT,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  show_toxicologico_message INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS process_selected_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id INTEGER NOT NULL REFERENCES step_processes(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL REFERENCES process_steps(id),
  professional_id INTEGER REFERENCES professionals(id),
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_selected_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id INTEGER NOT NULL REFERENCES step_processes(id) ON DELETE CASCADE,
  fee_id INTEGER NOT NULL REFERENCES fees(id),
  amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agency_instructions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  general_instructions TEXT,
  required_documents TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS professional_scheduled_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  scheduled_at DATETIME NOT NULL,
  working_days TEXT,
  working_hours TEXT,
  observations TEXT,
  created_by_user_id INTEGER REFERENCES system_users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_professional_scheduled_changes_professional ON professional_scheduled_changes(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_scheduled_changes_agency ON professional_scheduled_changes(agency_id);
CREATE INDEX IF NOT EXISTS idx_system_users_agency ON system_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cities_agency_id ON cities(agency_id);
CREATE INDEX IF NOT EXISTS idx_professionals_agency_id ON professionals(agency_id);
CREATE INDEX IF NOT EXISTS idx_professionals_city_id ON professionals(city_id);
CREATE INDEX IF NOT EXISTS idx_process_steps_agency_id ON process_steps(agency_id);
CREATE INDEX IF NOT EXISTS idx_fees_agency_id ON fees(agency_id);
CREATE INDEX IF NOT EXISTS idx_step_processes_agency_id ON step_processes(agency_id);
CREATE INDEX IF NOT EXISTS idx_step_processes_user_id ON step_processes(user_id);


-- Agencies table for multi-tenant architecture
CREATE TABLE agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table linking to Mocha Users Service and agencies
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  mocha_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'collaborator')),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cities table for each agency
CREATE TABLE cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  state TEXT DEFAULT 'SC',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Professionals table (doctors, psychologists, photo locations)
CREATE TABLE professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico')),
  city_id INTEGER NOT NULL,
  phone TEXT,
  address TEXT,
  observations TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step processes configuration
CREATE TABLE process_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fees/taxes configuration
CREATE TABLE fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step by step processes created by users
CREATE TABLE step_processes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  city_id INTEGER NOT NULL,
  client_name TEXT,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Selected steps for each process
CREATE TABLE process_selected_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id INTEGER NOT NULL,
  step_id INTEGER NOT NULL,
  professional_id INTEGER,
  is_completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Selected fees for each process
CREATE TABLE process_selected_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id INTEGER NOT NULL,
  fee_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_agency_id ON users(agency_id);
CREATE INDEX idx_users_mocha_user_id ON users(mocha_user_id);
CREATE INDEX idx_cities_agency_id ON cities(agency_id);
CREATE INDEX idx_professionals_agency_id ON professionals(agency_id);
CREATE INDEX idx_professionals_city_id ON professionals(city_id);
CREATE INDEX idx_process_steps_agency_id ON process_steps(agency_id);
CREATE INDEX idx_fees_agency_id ON fees(agency_id);
CREATE INDEX idx_step_processes_agency_id ON step_processes(agency_id);
CREATE INDEX idx_step_processes_user_id ON step_processes(user_id);

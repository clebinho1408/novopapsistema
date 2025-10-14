-- ============================================================================
-- MIGRAÇÕES COMPLETAS PARA BANCO DE PRODUÇÃO D1
-- Aplique este arquivo no Console do Cloudflare D1
-- ============================================================================

-- ============================================================================
-- PARTE 1: CRIAÇÃO DE TABELAS (Schema)
-- ============================================================================

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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  logo_key TEXT
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

-- System users table with email/password authentication
CREATE TABLE system_users (
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

-- User sessions table
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  attendance_type TEXT DEFAULT 'AGENDAMENTO' CHECK (attendance_type IN ('AGENDAMENTO', 'POR ORDEM DE CHEGADA')),
  working_days TEXT,
  working_hours TEXT,
  email TEXT
);

-- Process steps configuration
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  linked_professional_type TEXT CHECK (linked_professional_type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico'))
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  show_toxicologico_message BOOLEAN DEFAULT 0
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

-- Agency instructions
CREATE TABLE agency_instructions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  general_instructions TEXT,
  required_documents TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PARTE 2: ÍNDICES
-- ============================================================================

CREATE INDEX idx_users_agency_id ON users(agency_id);
CREATE INDEX idx_users_mocha_user_id ON users(mocha_user_id);
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
-- PARTE 3: DADOS (Configurações Preservadas)
-- ============================================================================

-- AGÊNCIA
INSERT INTO agencies (id, name, email, created_at) VALUES
(1, 'Balneário Camboriú', 'contato@bcamboriu.com', '2025-10-12 17:38:43');

-- USUÁRIO ADMINISTRADOR
INSERT INTO system_users (id, agency_id, name, email, password_hash, role, created_at) VALUES
(1, 1, 'Administrador', 'admin@bcamboriu.com', '$2b$10$sHazEuBXmztZchGGc0RwcuaJkaagp4QTdAz0enHXmZcOvtxSUjLKW', 'administrator', '2025-10-13 20:00:00');

-- CIDADES
INSERT INTO cities (id, agency_id, name, state, created_at) VALUES
(1, 1, 'BALNEÁRIO CAMBORIÚ', 'SC', '2025-10-12 17:40:23'),
(2, 1, 'BOMBINHAS', 'SC', '2025-10-12 17:40:43'),
(3, 1, 'CAMBORIÚ', 'SC', '2025-10-12 17:40:53'),
(4, 1, 'CANELINHA', 'SC', '2025-10-12 17:41:06'),
(5, 1, 'PORTO BELO', 'SC', '2025-10-12 17:41:38'),
(6, 1, 'ITAPEMA', 'SC', '2025-10-12 17:41:50'),
(7, 1, 'TIJUCAS', 'SC', '2025-10-12 17:42:06');

-- ETAPAS DO PROCESSO
INSERT INTO process_steps (id, agency_id, name, type, is_active, created_at) VALUES
(1, 1, 'Foto', 'foto', 1, '2025-10-12 17:38:43'),
(2, 1, 'Taxa', 'taxa', 1, '2025-10-12 17:38:43'),
(3, 1, 'Exame Médico', 'medico', 1, '2025-10-12 17:38:43'),
(4, 1, 'Exame Psicológico', 'psicologo', 1, '2025-10-12 17:38:43'),
(5, 1, 'Prova', 'prova', 1, '2025-10-12 17:38:43');

-- TAXAS (com vínculo correto para a taxa da prova)
INSERT INTO fees (id, agency_id, name, amount, is_active, linked_professional_type, created_at) VALUES
(1, 1, 'Emissão da CNH', 101.51, 1, NULL, '2025-10-12 17:38:43'),
(2, 1, 'Transferência', 53.37, 1, NULL, '2025-10-12 17:38:43'),
(3, 1, 'Psicólogo', 93.35, 1, 'psicologo', '2025-10-12 18:04:34'),
(4, 1, 'Médico', 86.26, 1, 'medico', '2025-10-12 18:05:04'),
(5, 1, 'Prova', 72.24, 1, 'prova', '2025-10-13 01:08:48');

-- CREDENCIADOS
INSERT INTO professionals (id, agency_id, name, type, is_active, city_id, created_at) VALUES
(1, 1, '29º DELEGACIA POLÍCIA CIVIL', 'foto', 1, 1, '2025-10-12 17:43:06'),
(2, 1, 'CAC BC', 'psicologo', 1, 1, '2025-10-12 17:43:48'),
(3, 1, 'CENTRO DE AV. DE CONDUTORES TIAGO FERRO', 'medico', 1, 1, '2025-10-12 17:44:33'),
(4, 1, 'CENTRO DE AVALIACAO DE CONDUTORES PIONEIROS', 'medico', 1, 1, '2025-10-12 17:45:21'),
(5, 1, 'CLINICA AVANTE', 'medico', 1, 1, '2025-10-12 17:46:07'),
(6, 1, 'CLINICA DE PSICOLOGIA DIRECAO', 'psicologo', 1, 1, '2025-10-12 17:46:55'),
(7, 1, 'FERREIRA AVALIACOES PSICOLOGICAS - FAP', 'psicologo', 1, 1, '2025-10-12 17:47:28'),
(8, 1, 'MEDITRAF-CLINICA DE MEDICINA DO TRAFEGO', 'medico', 1, 1, '2025-10-12 17:48:04'),
(9, 1, 'PROVA DE ATUALIZAÇÃO', 'prova', 1, 1, '2025-10-12 17:48:58'),
(10, 1, 'PROVA DE DIREÇÃO', 'prova', 1, 1, '2025-10-12 17:49:28'),
(11, 1, 'PSICO CLIN', 'psicologo', 1, 1, '2025-10-12 17:50:06'),
(12, 1, 'CAC BOMBINHAS', 'psicologo', 1, 2, '2025-10-12 17:50:58'),
(13, 1, 'CBM SEGURANCA E MEDICINA DO TRABALHO LTDA', 'medico', 1, 2, '2025-10-12 17:51:35'),
(14, 1, 'CAC AREIAS LTDA', 'medico', 1, 3, '2025-10-12 17:52:25'),
(15, 1, 'CAC CAMBORIU LTDA', 'medico', 1, 3, '2025-10-12 17:53:08'),
(16, 1, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', 1, 3, '2025-10-12 17:53:52'),
(17, 1, 'CLINICA DE PSICOLOGIA EM CAMBORIU', 'psicologo', 1, 3, '2025-10-12 17:54:36'),
(18, 1, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', 1, 4, '2025-10-12 17:55:33'),
(19, 1, 'TRA MED CAC LTDA', 'medico', 1, 6, '2025-10-12 17:57:05'),
(20, 1, 'CLINICA DE PSICOLOGIA EM ITAPEMA', 'psicologo', 1, 6, '2025-10-12 17:58:01'),
(21, 1, 'INSTITUTO DE MEDICINA DO TRAFEGO E OCUPACIONAL', 'medico', 1, 6, '2025-10-12 17:58:47'),
(22, 1, 'TRA MED CAC LTDA', 'medico', 1, 5, '2025-10-12 17:59:46'),
(23, 1, 'CAC MED PORTO BELO LTDA', 'medico', 1, 5, '2025-10-12 18:00:23'),
(24, 1, 'CAC PSICO PORTO BELO', 'psicologo', 1, 5, '2025-10-12 18:00:58'),
(25, 1, 'CAC TIJUCAS', 'psicologo', 1, 7, '2025-10-12 18:01:41'),
(26, 1, 'CAROLINA V. A. DE ASSIS LTDA', 'psicologo', 1, 7, '2025-10-12 18:02:14'),
(27, 1, 'CLINICA NK MEDICINA DE TRAFEGO', 'medico', 1, 7, '2025-10-12 18:02:58'),
(28, 1, 'TRANMED', 'medico', 1, 7, '2025-10-12 18:03:43');

-- ============================================================================
-- ✅ PRONTO! Schema e dados aplicados com sucesso!
-- Agora você pode republicar o aplicativo.
-- ============================================================================

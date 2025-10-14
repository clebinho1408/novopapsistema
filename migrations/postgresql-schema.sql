-- ============================================================================
-- MIGRAÇÃO COMPLETA PARA POSTGRESQL (Replit)
-- ============================================================================

-- Drop tables if they exist (para re-executar a migração se necessário)
DROP TABLE IF EXISTS process_selected_fees CASCADE;
DROP TABLE IF EXISTS process_selected_steps CASCADE;
DROP TABLE IF EXISTS step_processes CASCADE;
DROP TABLE IF EXISTS agency_instructions CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS process_steps CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- ============================================================================
-- PARTE 1: CRIAÇÃO DE TABELAS (Schema)
-- ============================================================================

-- Agencies table for multi-tenant architecture
CREATE TABLE agencies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logo_key TEXT
);

-- Users table linking to Mocha Users Service and agencies
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  mocha_user_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('administrator', 'collaborator')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System users table with email/password authentication
CREATE TABLE system_users (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('administrator', 'supervisor', 'collaborator')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER REFERENCES system_users(id),
  last_login_at TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cities table for each agency
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name VARCHAR(255) NOT NULL,
  state VARCHAR(2) DEFAULT 'SC',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Professionals table (doctors, psychologists, photo locations)
CREATE TABLE professionals (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico')),
  city_id INTEGER NOT NULL REFERENCES cities(id),
  phone VARCHAR(50),
  address TEXT,
  observations TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attendance_type VARCHAR(50) DEFAULT 'AGENDAMENTO' CHECK (attendance_type IN ('AGENDAMENTO', 'POR ORDEM DE CHEGADA')),
  working_days TEXT,
  working_hours TEXT,
  email VARCHAR(255)
);

-- Process steps configuration
CREATE TABLE process_steps (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fees/taxes configuration
CREATE TABLE fees (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  linked_professional_type VARCHAR(50) CHECK (linked_professional_type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico'))
);

-- Step by step processes created by users
CREATE TABLE step_processes (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  user_id INTEGER NOT NULL REFERENCES system_users(id),
  city_id INTEGER NOT NULL REFERENCES cities(id),
  client_name VARCHAR(255),
  total_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  show_toxicologico_message BOOLEAN DEFAULT FALSE
);

-- Selected steps for each process
CREATE TABLE process_selected_steps (
  id SERIAL PRIMARY KEY,
  process_id INTEGER NOT NULL REFERENCES step_processes(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL REFERENCES process_steps(id),
  professional_id INTEGER REFERENCES professionals(id),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Selected fees for each process
CREATE TABLE process_selected_fees (
  id SERIAL PRIMARY KEY,
  process_id INTEGER NOT NULL REFERENCES step_processes(id) ON DELETE CASCADE,
  fee_id INTEGER NOT NULL REFERENCES fees(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agency instructions
CREATE TABLE agency_instructions (
  id SERIAL PRIMARY KEY,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  general_instructions TEXT,
  required_documents TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
-- PARTE 3: DADOS INICIAIS
-- ============================================================================

-- AGÊNCIA
INSERT INTO agencies (id, name, email, created_at) VALUES
(1, 'Balneário Camboriú', 'contato@bcamboriu.com', '2025-10-12 17:38:43');

-- Resetar a sequência do ID para continuar do 2
SELECT setval('agencies_id_seq', 1, true);

-- USUÁRIO ADMINISTRADOR (senha: admin123)
INSERT INTO system_users (id, agency_id, name, email, password_hash, role, created_at) VALUES
(1, 1, 'Administrador', 'admin@bcamboriu.com', '$2b$10$sHazEuBXmztZchGGc0RwcuaJkaagp4QTdAz0enHXmZcOvtxSUjLKW', 'administrator', '2025-10-13 20:00:00');

SELECT setval('system_users_id_seq', 1, true);

-- CIDADES
INSERT INTO cities (id, agency_id, name, state, created_at) VALUES
(1, 1, 'BALNEÁRIO CAMBORIÚ', 'SC', '2025-10-12 17:40:23'),
(2, 1, 'BOMBINHAS', 'SC', '2025-10-12 17:40:43'),
(3, 1, 'CAMBORIÚ', 'SC', '2025-10-12 17:40:53'),
(4, 1, 'CANELINHA', 'SC', '2025-10-12 17:41:06'),
(5, 1, 'PORTO BELO', 'SC', '2025-10-12 17:41:38'),
(6, 1, 'ITAPEMA', 'SC', '2025-10-12 17:41:50'),
(7, 1, 'TIJUCAS', 'SC', '2025-10-12 17:42:06');

SELECT setval('cities_id_seq', 7, true);

-- ETAPAS DO PROCESSO
INSERT INTO process_steps (id, agency_id, name, type, is_active, created_at) VALUES
(1, 1, 'Foto', 'foto', TRUE, '2025-10-12 17:38:43'),
(2, 1, 'Taxa', 'taxa', TRUE, '2025-10-12 17:38:43'),
(3, 1, 'Exame Médico', 'medico', TRUE, '2025-10-12 17:38:43'),
(4, 1, 'Exame Psicológico', 'psicologo', TRUE, '2025-10-12 17:38:43'),
(5, 1, 'Prova', 'prova', TRUE, '2025-10-12 17:38:43');

SELECT setval('process_steps_id_seq', 5, true);

-- TAXAS
INSERT INTO fees (id, agency_id, name, amount, is_active, linked_professional_type, created_at) VALUES
(1, 1, 'Emissão da CNH', 101.51, TRUE, NULL, '2025-10-12 17:38:43'),
(2, 1, 'Transferência', 53.37, TRUE, NULL, '2025-10-12 17:38:43'),
(3, 1, 'Psicólogo', 93.35, TRUE, 'psicologo', '2025-10-12 18:04:34'),
(4, 1, 'Médico', 86.26, TRUE, 'medico', '2025-10-12 18:05:04'),
(5, 1, 'Prova', 72.24, TRUE, 'prova', '2025-10-13 01:08:48');

SELECT setval('fees_id_seq', 5, true);

-- CREDENCIADOS
INSERT INTO professionals (id, agency_id, name, type, is_active, city_id, created_at) VALUES
(1, 1, '29º DELEGACIA POLÍCIA CIVIL', 'foto', TRUE, 1, '2025-10-12 17:43:06'),
(2, 1, 'CAC BC', 'psicologo', TRUE, 1, '2025-10-12 17:43:48'),
(3, 1, 'CENTRO DE AV. DE CONDUTORES TIAGO FERRO', 'medico', TRUE, 1, '2025-10-12 17:44:33'),
(4, 1, 'CENTRO DE AVALIACAO DE CONDUTORES PIONEIROS', 'medico', TRUE, 1, '2025-10-12 17:45:21'),
(5, 1, 'CLINICA AVANTE', 'medico', TRUE, 1, '2025-10-12 17:46:07'),
(6, 1, 'CLINICA DE PSICOLOGIA DIRECAO', 'psicologo', TRUE, 1, '2025-10-12 17:46:55'),
(7, 1, 'FERREIRA AVALIACOES PSICOLOGICAS - FAP', 'psicologo', TRUE, 1, '2025-10-12 17:47:28'),
(8, 1, 'MEDITRAF-CLINICA DE MEDICINA DO TRAFEGO', 'medico', TRUE, 1, '2025-10-12 17:48:04'),
(9, 1, 'PROVA DE ATUALIZAÇÃO', 'prova', TRUE, 1, '2025-10-12 17:48:58'),
(10, 1, 'PROVA DE DIREÇÃO', 'prova', TRUE, 1, '2025-10-12 17:49:28'),
(11, 1, 'PSICO CLIN', 'psicologo', TRUE, 1, '2025-10-12 17:50:06'),
(12, 1, 'CAC BOMBINHAS', 'psicologo', TRUE, 2, '2025-10-12 17:50:58'),
(13, 1, 'CBM SEGURANCA E MEDICINA DO TRABALHO LTDA', 'medico', TRUE, 2, '2025-10-12 17:51:35'),
(14, 1, 'CAC AREIAS LTDA', 'medico', TRUE, 3, '2025-10-12 17:52:25'),
(15, 1, 'CAC CAMBORIU LTDA', 'medico', TRUE, 3, '2025-10-12 17:53:08'),
(16, 1, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', TRUE, 3, '2025-10-12 17:53:52'),
(17, 1, 'CLINICA DE PSICOLOGIA EM CAMBORIU', 'psicologo', TRUE, 3, '2025-10-12 17:54:36'),
(18, 1, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', TRUE, 4, '2025-10-12 17:55:33'),
(19, 1, 'TRA MED CAC LTDA', 'medico', TRUE, 6, '2025-10-12 17:57:05'),
(20, 1, 'CLINICA DE PSICOLOGIA EM ITAPEMA', 'psicologo', TRUE, 6, '2025-10-12 17:58:01'),
(21, 1, 'INSTITUTO DE MEDICINA DO TRAFEGO E OCUPACIONAL', 'medico', TRUE, 6, '2025-10-12 17:58:47'),
(22, 1, 'TRA MED CAC LTDA', 'medico', TRUE, 5, '2025-10-12 17:59:46'),
(23, 1, 'CAC MED PORTO BELO LTDA', 'medico', TRUE, 5, '2025-10-12 18:00:23'),
(24, 1, 'CAC PSICO PORTO BELO', 'psicologo', TRUE, 5, '2025-10-12 18:00:58'),
(25, 1, 'CAC TIJUCAS', 'psicologo', TRUE, 7, '2025-10-12 18:01:41'),
(26, 1, 'CAROLINA V. A. DE ASSIS LTDA', 'psicologo', TRUE, 7, '2025-10-12 18:02:14'),
(27, 1, 'CLINICA NK MEDICINA DE TRAFEGO', 'medico', TRUE, 7, '2025-10-12 18:02:58'),
(28, 1, 'TRANMED', 'medico', TRUE, 7, '2025-10-12 18:03:43');

SELECT setval('professionals_id_seq', 28, true);

-- ============================================================================
-- ✅ PRONTO! Schema PostgreSQL criado com sucesso!
-- ============================================================================

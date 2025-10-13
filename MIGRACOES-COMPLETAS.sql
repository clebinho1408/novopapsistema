-- ============================================================================
-- TODAS AS MIGRAÇÕES - Para aplicar no Console do Cloudflare D1
-- Copie TUDO e cole no Console do banco pap-sistema-producao
-- ============================================================================
UPDATE process_steps SET is_active = 0 WHERE type = 'toxicologico';
CREATE TABLE agency_instructions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  general_instructions TEXT,
  required_documents TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create table for local system users with email/password authentication
CREATE TABLE system_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'collaborator')),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INTEGER,
  last_login_at DATETIME
);

-- Create index for email lookups
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_system_users_agency ON system_users(agency_id);

-- Create sessions table for managing user sessions
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Primeiro vamos garantir que a agência existe
INSERT OR IGNORE INTO agencies (id, name, email, is_active) 
VALUES (1, 'Agência Balneário Camboriú', 'contato@bcamboriu.com', 1);

-- Agora vamos deletar qualquer usuário existente com esse email para recriar corretamente
DELETE FROM system_users WHERE email = 'clebinhodesign@gmail.com';

-- Criar o usuário administrador com senha hash correta
INSERT INTO system_users (agency_id, email, password_hash, name, role, is_active) 
VALUES (
  1, 
  'clebinhodesign@gmail.com', 
  '$2a$12$LQv3c1yqBwmnJ7VKF1oJHO7a9mKGzr8K7qhbz8..HgQfCj7Pm15Wa', 
  'Administrador', 
  'administrator', 
  1
);

-- Remove any existing user with this email first
DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM system_users WHERE email = 'clebinhodesign@gmail.com');
DELETE FROM system_users WHERE email = 'clebinhodesign@gmail.com';

-- Insert the user with correct bcrypt hash for 'admin123'
INSERT INTO system_users (agency_id, email, password_hash, name, role, is_active, created_at, updated_at) 
VALUES (1, 'clebinhodesign@gmail.com', '$2b$12$LQv3c1yqBwLFaJGk2FmyNOuiM8h8gY3fP4g4nNtMsHgZqCdTJ9EcK', 'Administrador', 'administrator', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Complete database reset - remove all data from all tables
DELETE FROM user_sessions;
DELETE FROM process_selected_fees;
DELETE FROM process_selected_steps;
DELETE FROM step_processes;
DELETE FROM agency_instructions;
DELETE FROM fees;
DELETE FROM process_steps;
DELETE FROM professionals;
DELETE FROM cities;
DELETE FROM system_users;
DELETE FROM users;
DELETE FROM agencies;

-- Reset autoincrement sequences
DELETE FROM sqlite_sequence WHERE name IN (
  'agencies', 'users', 'cities', 'professionals', 'process_steps', 
  'fees', 'step_processes', 'process_selected_steps', 'process_selected_fees',
  'agency_instructions', 'system_users', 'user_sessions'
);

-- Remove any existing toxicologico steps
DELETE FROM process_steps WHERE type = 'toxicologico';

-- Remove any existing toxicologico professionals
UPDATE professionals SET is_active = 0 WHERE type = 'toxicologico';

-- Remove any existing toxicologico linked fees
UPDATE fees SET linked_professional_type = NULL WHERE linked_professional_type = 'toxicologico';
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
ALTER TABLE professionals ADD COLUMN attendance_type TEXT DEFAULT 'AGENDAMENTO' CHECK (attendance_type IN ('AGENDAMENTO', 'POR ORDEM DE CHEGADA'));
ALTER TABLE agencies ADD COLUMN logo_key TEXT;

ALTER TABLE fees ADD COLUMN linked_professional_type TEXT CHECK (linked_professional_type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico'));

ALTER TABLE professionals ADD COLUMN working_days TEXT;
ALTER TABLE professionals ADD COLUMN working_hours TEXT;

ALTER TABLE professionals ADD COLUMN email TEXT;
ALTER TABLE step_processes ADD COLUMN show_toxicologico_message BOOLEAN DEFAULT 0;
UPDATE process_steps 
SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
WHERE type = 'toxicologico';

UPDATE process_steps 
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE type = 'toxicologico';
-- ============================================================================
-- SCRIPT DE MIGRAÇÃO PARA BANCO DE PRODUÇÃO
-- ============================================================================
-- Este script contém todos os dados de configuração e credenciados
-- que devem ser preservados ao migrar para o banco de produção.
--
-- COMO USAR:
-- 1. Crie um novo banco D1 de produção no Cloudflare
-- 2. Aplique todas as migrações (17 arquivos em /migrations)
-- 3. Execute este script para importar os dados
-- ============================================================================

-- AGÊNCIA
INSERT INTO agencies (id, name, created_at) VALUES
(1, 'Balneário Camboriú', '2025-10-12 17:38:43');

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
INSERT INTO process_steps (id, name, type, is_active, created_at) VALUES
(1, 'Foto', 'foto', 1, '2025-10-12 17:38:43'),
(2, 'Taxa', 'taxa', 1, '2025-10-12 17:38:43'),
(3, 'Exame Médico', 'medico', 1, '2025-10-12 17:38:43'),
(4, 'Exame Psicológico', 'psicologo', 1, '2025-10-12 17:38:43'),
(5, 'Prova', 'prova', 1, '2025-10-12 17:38:43');

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
-- IMPORTANTE: Após aplicar este script, você precisará criar um novo usuário
-- administrativo usando o endpoint /api/auth/register
-- ============================================================================


-- ============================================================================
-- ✅ PRONTO! Schema e dados foram aplicados com sucesso!
-- ============================================================================

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

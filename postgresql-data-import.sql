-- ============================================================================
-- POSTGRESQL DATA IMPORT - Preserved Data from D1
-- ============================================================================

-- AGÊNCIA
INSERT INTO agencies (id, name, email, created_at) VALUES
(1, 'Balneário Camboriú', 'contato@bcamboriu.com', '2025-10-12 17:38:43');

-- Update sequence to continue from correct ID
SELECT setval('agencies_id_seq', (SELECT MAX(id) FROM agencies));

-- CIDADES
INSERT INTO cities (id, agency_id, name, state, created_at) VALUES
(1, 1, 'BALNEÁRIO CAMBORIÚ', 'SC', '2025-10-12 17:40:23'),
(2, 1, 'BOMBINHAS', 'SC', '2025-10-12 17:40:43'),
(3, 1, 'CAMBORIÚ', 'SC', '2025-10-12 17:40:53'),
(4, 1, 'CANELINHA', 'SC', '2025-10-12 17:41:06'),
(5, 1, 'PORTO BELO', 'SC', '2025-10-12 17:41:38'),
(6, 1, 'ITAPEMA', 'SC', '2025-10-12 17:41:50'),
(7, 1, 'TIJUCAS', 'SC', '2025-10-12 17:42:06');

SELECT setval('cities_id_seq', (SELECT MAX(id) FROM cities));

-- ETAPAS DO PROCESSO
INSERT INTO process_steps (id, agency_id, name, type, is_active, created_at) VALUES
(1, 1, 'Foto', 'foto', true, '2025-10-12 17:38:43'),
(2, 1, 'Taxa', 'taxa', true, '2025-10-12 17:38:43'),
(3, 1, 'Exame Médico', 'medico', true, '2025-10-12 17:38:43'),
(4, 1, 'Exame Psicológico', 'psicologo', true, '2025-10-12 17:38:43'),
(5, 1, 'Prova', 'prova', true, '2025-10-12 17:38:43');

SELECT setval('process_steps_id_seq', (SELECT MAX(id) FROM process_steps));

-- TAXAS (com vínculo correto para a taxa da prova)
INSERT INTO fees (id, agency_id, name, amount, is_active, linked_professional_type, created_at) VALUES
(1, 1, 'Emissão da CNH', 101.51, true, NULL, '2025-10-12 17:38:43'),
(2, 1, 'Transferência', 53.37, true, NULL, '2025-10-12 17:38:43'),
(3, 1, 'Psicólogo', 93.35, true, 'psicologo', '2025-10-12 18:04:34'),
(4, 1, 'Médico', 86.26, true, 'medico', '2025-10-12 18:05:04'),
(5, 1, 'Prova', 72.24, true, 'prova', '2025-10-13 01:08:48');

SELECT setval('fees_id_seq', (SELECT MAX(id) FROM fees));

-- CREDENCIADOS
INSERT INTO professionals (id, agency_id, name, type, is_active, city_id, created_at) VALUES
(1, 1, '29º DELEGACIA POLÍCIA CIVIL', 'foto', true, 1, '2025-10-12 17:43:06'),
(2, 1, 'CAC BC', 'psicologo', true, 1, '2025-10-12 17:43:48'),
(3, 1, 'CENTRO DE AV. DE CONDUTORES TIAGO FERRO', 'medico', true, 1, '2025-10-12 17:44:33'),
(4, 1, 'CENTRO DE AVALIACAO DE CONDUTORES PIONEIROS', 'medico', true, 1, '2025-10-12 17:45:21'),
(5, 1, 'CLINICA AVANTE', 'medico', true, 1, '2025-10-12 17:46:07'),
(6, 1, 'CLINICA DE PSICOLOGIA DIRECAO', 'psicologo', true, 1, '2025-10-12 17:46:55'),
(7, 1, 'FERREIRA AVALIACOES PSICOLOGICAS - FAP', 'psicologo', true, 1, '2025-10-12 17:47:28'),
(8, 1, 'MEDITRAF-CLINICA DE MEDICINA DO TRAFEGO', 'medico', true, 1, '2025-10-12 17:48:04'),
(9, 1, 'PROVA DE ATUALIZAÇÃO', 'prova', true, 1, '2025-10-12 17:48:58'),
(10, 1, 'PROVA DE DIREÇÃO', 'prova', true, 1, '2025-10-12 17:49:28'),
(11, 1, 'PSICO CLIN', 'psicologo', true, 1, '2025-10-12 17:50:06'),
(12, 1, 'CAC BOMBINHAS', 'psicologo', true, 2, '2025-10-12 17:50:58'),
(13, 1, 'CBM SEGURANCA E MEDICINA DO TRABALHO LTDA', 'medico', true, 2, '2025-10-12 17:51:35'),
(14, 1, 'CAC AREIAS LTDA', 'medico', true, 3, '2025-10-12 17:52:25'),
(15, 1, 'CAC CAMBORIU LTDA', 'medico', true, 3, '2025-10-12 17:53:08'),
(16, 1, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', true, 3, '2025-10-12 17:53:52'),
(17, 1, 'CLINICA DE PSICOLOGIA EM CAMBORIU', 'psicologo', true, 3, '2025-10-12 17:54:36'),
(18, 1, 'CAC- CLINICA DE MEDICINA DO TRAFEGO LTDA', 'medico', true, 4, '2025-10-12 17:55:33'),
(19, 1, 'TRA MED CAC LTDA', 'medico', true, 6, '2025-10-12 17:57:05'),
(20, 1, 'CLINICA DE PSICOLOGIA EM ITAPEMA', 'psicologo', true, 6, '2025-10-12 17:58:01'),
(21, 1, 'INSTITUTO DE MEDICINA DO TRAFEGO E OCUPACIONAL', 'medico', true, 6, '2025-10-12 17:58:47'),
(22, 1, 'TRA MED CAC LTDA', 'medico', true, 5, '2025-10-12 17:59:46'),
(23, 1, 'CAC MED PORTO BELO LTDA', 'medico', true, 5, '2025-10-12 18:00:23'),
(24, 1, 'CAC PSICO PORTO BELO', 'psicologo', true, 5, '2025-10-12 18:00:58'),
(25, 1, 'CAC TIJUCAS', 'psicologo', true, 7, '2025-10-12 18:01:41'),
(26, 1, 'CAROLINA V. A. DE ASSIS LTDA', 'psicologo', true, 7, '2025-10-12 18:02:14'),
(27, 1, 'CLINICA NK MEDICINA DE TRAFEGO', 'medico', true, 7, '2025-10-12 18:02:58'),
(28, 1, 'TRANMED', 'medico', true, 7, '2025-10-12 18:03:43');

SELECT setval('professionals_id_seq', (SELECT MAX(id) FROM professionals));

-- ============================================================================
-- NOTA: Você precisará criar um novo usuário administrativo via interface
-- após a migração estar completa.
-- ============================================================================

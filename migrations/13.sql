
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

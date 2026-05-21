-- Migração: Agendamento de alterações em credenciados
-- Execute no D1 remoto: npx wrangler d1 execute pap-sistema-producao --remote --file=d1-migration-scheduled-changes.sql

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

CREATE INDEX IF NOT EXISTS idx_professional_scheduled_changes_professional ON professional_scheduled_changes(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_scheduled_changes_agency ON professional_scheduled_changes(agency_id);

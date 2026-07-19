-- Migration 19: Add aviso_reinicio to step_processes
ALTER TABLE step_processes ADD COLUMN IF NOT EXISTS aviso_reinicio BOOLEAN DEFAULT FALSE;

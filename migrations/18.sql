-- Migration 18: Add categoria_atual to step_processes
ALTER TABLE step_processes ADD COLUMN IF NOT EXISTS categoria_atual TEXT;

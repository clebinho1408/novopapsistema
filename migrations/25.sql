-- Cloudflare D1: apply explicitly through the existing migration process.
CREATE TABLE IF NOT EXISTS agency_term_templates (
  agency_id INTEGER PRIMARY KEY REFERENCES agencies(id),
  enabled BOOLEAN NOT NULL DEFAULT false,
  object_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

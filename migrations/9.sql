
UPDATE process_steps 
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE type = 'toxicologico';

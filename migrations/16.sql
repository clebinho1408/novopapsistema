
-- Remove any existing toxicologico steps
DELETE FROM process_steps WHERE type = 'toxicologico';

-- Remove any existing toxicologico professionals
UPDATE professionals SET is_active = 0 WHERE type = 'toxicologico';

-- Remove any existing toxicologico linked fees
UPDATE fees SET linked_professional_type = NULL WHERE linked_professional_type = 'toxicologico';

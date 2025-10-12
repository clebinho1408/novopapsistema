
ALTER TABLE fees ADD COLUMN linked_professional_type TEXT CHECK (linked_professional_type IN ('foto', 'medico', 'psicologo', 'prova', 'toxicologico'));

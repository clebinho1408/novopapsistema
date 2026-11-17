-- Add temporary hide timestamp for professionals in Step Process
ALTER TABLE professionals ADD COLUMN hidden_until DATETIME;

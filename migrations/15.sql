
-- Complete database reset - remove all data from all tables
DELETE FROM user_sessions;
DELETE FROM process_selected_fees;
DELETE FROM process_selected_steps;
DELETE FROM step_processes;
DELETE FROM agency_instructions;
DELETE FROM fees;
DELETE FROM process_steps;
DELETE FROM professionals;
DELETE FROM cities;
DELETE FROM system_users;
DELETE FROM users;
DELETE FROM agencies;

-- Reset autoincrement sequences
DELETE FROM sqlite_sequence WHERE name IN (
  'agencies', 'users', 'cities', 'professionals', 'process_steps', 
  'fees', 'step_processes', 'process_selected_steps', 'process_selected_fees',
  'agency_instructions', 'system_users', 'user_sessions'
);

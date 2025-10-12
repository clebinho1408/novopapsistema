
DROP INDEX idx_step_processes_user_id;
DROP INDEX idx_step_processes_agency_id;
DROP INDEX idx_fees_agency_id;
DROP INDEX idx_process_steps_agency_id;
DROP INDEX idx_professionals_city_id;
DROP INDEX idx_professionals_agency_id;
DROP INDEX idx_cities_agency_id;
DROP INDEX idx_users_mocha_user_id;
DROP INDEX idx_users_agency_id;

DROP TABLE process_selected_fees;
DROP TABLE process_selected_steps;
DROP TABLE step_processes;
DROP TABLE fees;
DROP TABLE process_steps;
DROP TABLE professionals;
DROP TABLE cities;
DROP TABLE users;
DROP TABLE agencies;

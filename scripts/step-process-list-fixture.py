"""Run the list endpoint's real SQL against an isolated, in-memory SQLite fixture."""
import json
import sqlite3
import sys

request = json.load(sys.stdin)
db = sqlite3.connect(":memory:")
db.row_factory = sqlite3.Row
db.executescript("""
CREATE TABLE cities (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE system_users (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE step_processes (
  id INTEGER PRIMARY KEY, agency_id INTEGER, user_id INTEGER,
  client_name TEXT, city_id INTEGER, total_amount TEXT, created_at TEXT
);
CREATE TABLE process_steps (id INTEGER PRIMARY KEY, type TEXT);
CREATE TABLE professionals (id INTEGER PRIMARY KEY, agency_id INTEGER, name TEXT);
CREATE TABLE process_selected_steps (
  id INTEGER PRIMARY KEY, process_id INTEGER, step_id INTEGER, professional_id INTEGER
);
INSERT INTO cities VALUES (1, 'Cidade de teste');
INSERT INTO system_users VALUES (5, 'Atendente de teste'), (6, 'Outro atendente');
INSERT INTO process_steps VALUES (1, 'psicologo'), (2, 'medico'), (3, 'foto');
INSERT INTO professionals VALUES
  (1, 2, 'Psicóloga escolhida'), (2, 2, 'Médico escolhido'),
  (3, 2, 'Médico individual'), (4, 2, 'Psicóloga individual'),
  (5, 9, 'Credenciado de outra agência');
INSERT INTO process_selected_steps VALUES
  (1, 11, 1, 1), (2, 11, 2, 2), (3, 12, 2, 3), (4, 13, 1, 4),
  (5, 14, 2, NULL), (6, 14, 1, 5), (7, 15, 2, 2), (8, 16, 2, 5);
""")
for row in request["rows"]:
    db.execute("INSERT INTO step_processes VALUES (?, 2, 5, ?, 1, '100', '2026-01-01')",
               (row["id"], row["client_name"]))
db.execute("INSERT INTO step_processes VALUES (15, 2, 6, 'OUTRO_USUARIO', 1, '100', '2025-01-01')")
db.execute("INSERT INTO step_processes VALUES (16, 9, 5, 'OUTRA_AGENCIA', 1, '100', '2025-01-01')")
for index in range(250):
    db.execute("INSERT INTO step_processes VALUES (?, 2, 5, 'HISTORICO_EXTENSO', 1, '100', '2024-01-01')",
               (1000 + index,))
    db.execute("INSERT INTO process_selected_steps (process_id, step_id, professional_id) VALUES (?, 2, 2)",
               (1000 + index,))
result = [dict(row) for row in db.execute(request["sql"], request["params"])]
print(json.dumps(result))

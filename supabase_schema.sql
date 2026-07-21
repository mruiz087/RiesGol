-- Supabase SQL Schema para RiesGol (referencia simplificada)
-- Para el esquema completo ver docs/project_sql.txt y docs/migrations/

CREATE SCHEMA IF NOT EXISTS porra;

-- Catálogo de equipos por torneo (identidad; sin valores de puntuación)
CREATE TABLE porra.teams (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    tournament_id BIGINT REFERENCES porra.tournaments(id) ON DELETE CASCADE,
    crest_url TEXT
);

CREATE UNIQUE INDEX ux_teams_tournament_nombre ON porra.teams(tournament_id, nombre);

ALTER TABLE porra.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read teams" ON porra.teams FOR SELECT USING (true);

-- Valores y bombos configurados por porra
CREATE TABLE porra.group_team_values (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES porra.groups(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES porra.teams(id) ON DELETE CASCADE,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
    bombo TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, team_id)
);

ALTER TABLE porra.group_team_values ENABLE ROW LEVEL SECURITY;

-- Ver migración completa: docs/migrations/2026-07-13_group_team_values.sql

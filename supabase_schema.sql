-- Supabase SQL Schema para RiesGol
-- Copia y pega esto en el SQL Editor de Supabase y ejecútalo.

-- Crear el esquema porra
CREATE SCHEMA IF NOT EXISTS porra;

-- 1. Crear Tabla de Usuarios Extendida
CREATE TABLE porra.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para users
ALTER TABLE porra.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all users" ON porra.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own record" ON porra.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own record" ON porra.users FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Crear Tabla de Equipos
CREATE TABLE porra.teams (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    puntos_fifa FLOAT NOT NULL,
    grupo TEXT NOT NULL -- ej: 'A', 'B', 'C'
);

-- Habilitar RLS para teams
ALTER TABLE porra.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read teams" ON porra.teams FOR SELECT USING (true);

-- 3. Crear Tabla de Partidos (Matches)
CREATE TABLE porra.matches (
    id SERIAL PRIMARY KEY,
    equipo_local_id INTEGER REFERENCES porra.teams(id),
    equipo_visitante_id INTEGER REFERENCES porra.teams(id),
    equipo_local_nombre TEXT NOT NULL,
    equipo_visitante_nombre TEXT NOT NULL,
    fase TEXT NOT NULL, -- ej: 'Grupos', 'Octavos', 'Cuartos'
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    goles_local INTEGER,
    goles_visitante INTEGER,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_juego', 'finalizado'
    external_api_id INTEGER UNIQUE -- Para enlazar con la API de deportes
);

-- Habilitar RLS para matches
ALTER TABLE porra.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read matches" ON porra.matches FOR SELECT USING (true);

-- 4. Crear Tabla de Apuestas (Bets)
CREATE TABLE porra.bets (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES porra.users(id) ON DELETE CASCADE,
    match_id INTEGER REFERENCES porra.matches(id) ON DELETE CASCADE,
    prediccion TEXT NOT NULL CHECK (prediccion IN ('1', 'X', '2')),
    fecha_apuesta TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, match_id) -- Un usuario solo puede tener una apuesta por partido
);

-- Habilitar RLS para bets
ALTER TABLE porra.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read all bets" ON porra.bets FOR SELECT USING (true);
CREATE POLICY "Users can insert their own bets" ON porra.bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bets" ON porra.bets FOR UPDATE USING (auth.uid() = user_id);

-- 5. Crear Tabla de Pichichi (pichichi_teams)
CREATE TABLE porra.pichichi_teams (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES porra.users(id) ON DELETE CASCADE,
    equipo_id INTEGER REFERENCES porra.teams(id) ON DELETE CASCADE,
    grupo TEXT NOT NULL,
    fecha_seleccion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, grupo) -- Un usuario solo puede elegir un equipo por grupo
);

-- Habilitar RLS para pichichi_teams
ALTER TABLE porra.pichichi_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read all pichichi selections" ON porra.pichichi_teams FOR SELECT USING (true);
CREATE POLICY "Users can insert their own pichichi" ON porra.pichichi_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pichichi" ON porra.pichichi_teams FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own pichichi" ON porra.pichichi_teams FOR UPDATE USING (auth.uid() = user_id);

-- Insertar algunos equipos de prueba con puntos FIFA simulados y Grupos
INSERT INTO porra.teams (nombre, puntos_fifa, grupo) VALUES 
('Alemania', 1644, 'A'),
('Escocia', 1300, 'A'),
('España', 1727, 'B'),
('Italia', 1718, 'B'),
('Inglaterra', 1801, 'C'),
('Dinamarca', 1600, 'C'),
('Francia', 1845, 'D'),
('Países Bajos', 1742, 'D');

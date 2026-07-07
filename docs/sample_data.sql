-- Script para generar datos ficticios de prueba
-- Este script crea usuarios, apuestas y selecciones de Pichichi para simular el funcionamiento real

-- NOTA: Este script asume que ya tienes:
-- 1. Un torneo WC insertado
-- 2. Partidos sincronizados (104 partidos)
-- 3. Una porra de prueba creada
-- 4. Tu usuario creado en Supabase Auth

-- ============================================
-- 1. CREAR USUARIOS FICTICIOS
-- ============================================

-- Primero, necesitamos crear los usuarios en Supabase Auth (esto se hace desde el dashboard)
-- Luego insertamos sus perfiles en la tabla users

-- Reemplaza estos UUIDs con los IDs reales de los usuarios que crees en Supabase Auth
-- Puedes crear usuarios en Authentication → Users → Add user

-- Usuario 1: Juan Pérez
INSERT INTO porra.users (id, name, puntaje_total, elegible_ultimo_puesto)
VALUES ('USER_ID_1', 'Juan Pérez', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Usuario 2: María García
INSERT INTO porra.users (id, name, puntaje_total, elegible_ultimo_puesto)
VALUES ('USER_ID_2', 'María García', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Usuario 3: Carlos López
INSERT INTO porra.users (id, name, puntaje_total, elegible_ultimo_puesto)
VALUES ('USER_ID_3', 'Carlos López', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Usuario 4: Ana Martínez
INSERT INTO porra.users (id, name, puntaje_total, elegible_ultimo_puesto)
VALUES ('USER_ID_4', 'Ana Martínez', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Usuario 5: Pedro Sánchez
INSERT INTO porra.users (id, name, puntaje_total, elegible_ultimo_puesto)
VALUES ('USER_ID_5', 'Pedro Sánchez', 0, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. AÑADIR USUARIOS A LA PORRA DE PRUEBA
-- ============================================

-- Reemplaza GROUP_ID con el ID de tu porra de prueba
-- Puedes obtenerlo con: SELECT id FROM porra.groups WHERE nombre = 'Porra de Prueba';

-- Añadir usuarios como miembros
INSERT INTO porra.group_members (group_id, user_id, role)
VALUES 
    (GROUP_ID, 'USER_ID_1', 'member'),
    (GROUP_ID, 'USER_ID_2', 'member'),
    (GROUP_ID, 'USER_ID_3', 'member'),
    (GROUP_ID, 'USER_ID_4', 'member'),
    (GROUP_ID, 'USER_ID_5', 'member')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. CREAR APUESTAS FICTICIAS
-- ============================================

-- Obtener algunos partidos para crear apuestas
-- Este ejemplo crea apuestas para los primeros 10 partidos

-- Usuario 1: Juan Pérez - Apuestas variadas
INSERT INTO porra.bets (match_id, user_id, group_id, prediccion, puntos, fase)
SELECT 
    m.id,
    'USER_ID_1',
    GROUP_ID,
    CASE m.id % 3 
        WHEN 0 THEN '1'
        WHEN 1 THEN 'X'
        ELSE '2'
    END,
    0,
    m.fase
FROM porra.matches m
WHERE m.tournament_id = (SELECT id FROM porra.tournaments WHERE external_code = 'WC')
LIMIT 20
ON CONFLICT (match_id, user_id, group_id) DO NOTHING;

-- Usuario 2: María García - Predice más 1s
INSERT INTO porra.bets (match_id, user_id, group_id, prediccion, puntos, fase)
SELECT 
    m.id,
    'USER_ID_2',
    GROUP_ID,
    CASE m.id % 4 
        WHEN 0 THEN 'X'
        WHEN 1 THEN '2'
        ELSE '1'
    END,
    0,
    m.fase
FROM porra.matches m
WHERE m.tournament_id = (SELECT id FROM porra.tournaments WHERE external_code = 'WC')
LIMIT 20
ON CONFLICT (match_id, user_id, group_id) DO NOTHING;

-- Usuario 3: Carlos López - Predige más 2s
INSERT INTO porra.bets (match_id, user_id, group_id, prediccion, puntos, fase)
SELECT 
    m.id,
    'USER_ID_3',
    GROUP_ID,
    CASE m.id % 4 
        WHEN 0 THEN '1'
        WHEN 1 THEN 'X'
        ELSE '2'
    END,
    0,
    m.fase
FROM porra.matches m
WHERE m.tournament_id = (SELECT id FROM porra.tournaments WHERE external_code = 'WC')
LIMIT 20
ON CONFLICT (match_id, user_id, group_id) DO NOTHING;

-- Usuario 4: Ana Martínez - Predige más empates
INSERT INTO porra.bets (match_id, user_id, group_id, prediccion, puntos, fase)
SELECT 
    m.id,
    'USER_ID_4',
    GROUP_ID,
    CASE m.id % 3 
        WHEN 0 THEN '1'
        WHEN 1 THEN '2'
        ELSE 'X'
    END,
    0,
    m.fase
FROM porra.matches m
WHERE m.tournament_id = (SELECT id FROM porra.tournaments WHERE external_code = 'WC')
LIMIT 20
ON CONFLICT (match_id, user_id, group_id) DO NOTHING;

-- Usuario 5: Pedro Sánchez - Apuestas aleatorias
INSERT INTO porra.bets (match_id, user_id, group_id, prediccion, puntos, fase)
SELECT 
    m.id,
    'USER_ID_5',
    GROUP_ID,
    CASE m.id % 3 
        WHEN 0 THEN '2'
        WHEN 1 THEN '1'
        ELSE 'X'
    END,
    0,
    m.fase
FROM porra.matches m
WHERE m.tournament_id = (SELECT id FROM porra.tournaments WHERE external_code = 'WC')
LIMIT 20
ON CONFLICT (match_id, user_id, group_id) DO NOTHING;

-- ============================================
-- 4. CREAR SELECCIONES DE PICHICHI FICTICIAS
-- ============================================

-- Usuario 1: Juan Pérez - Selecciones de bombos
INSERT INTO porra.favorite_selections (user_id, group_id, team_id, bombo, puntos)
SELECT 
    'USER_ID_1',
    GROUP_ID,
    t.id,
    t.grupo,
    t.puntos_fifa
FROM porra.teams t
WHERE t.grupo IN ('A', 'B', 'C', 'D')
ORDER BY t.puntos_fifa DESC
LIMIT 4
ON CONFLICT (group_id, user_id, bombo) DO NOTHING;

-- Usuario 2: María García - Selecciones de bombos
INSERT INTO porra.favorite_selections (user_id, group_id, team_id, bombo, puntos)
SELECT 
    'USER_ID_2',
    GROUP_ID,
    t.id,
    t.grupo,
    t.puntos_fifa
FROM porra.teams t
WHERE t.grupo IN ('A', 'B', 'C', 'D')
ORDER BY t.puntos_fifa ASC
LIMIT 4
ON CONFLICT (group_id, user_id, bombo) DO NOTHING;

-- Usuario 3: Carlos López - Selecciones de bombos
INSERT INTO porra.favorite_selections (user_id, group_id, team_id, bombo, puntos)
SELECT 
    'USER_ID_3',
    GROUP_ID,
    t.id,
    t.grupo,
    t.puntos_fifa
FROM porra.teams t
WHERE t.grupo IN ('E', 'F', 'G', 'H')
ORDER BY t.puntos_fifa DESC
LIMIT 4
ON CONFLICT (group_id, user_id, bombo) DO NOTHING;

-- Usuario 4: Ana Martínez - Selecciones de bombos
INSERT INTO porra.favorite_selections (user_id, group_id, team_id, bombo, puntos)
SELECT 
    'USER_ID_4',
    GROUP_ID,
    t.id,
    t.grupo,
    t.puntos_fifa
FROM porra.teams t
WHERE t.grupo IN ('E', 'F', 'G', 'H')
ORDER BY t.puntos_fifa ASC
LIMIT 4
ON CONFLICT (group_id, user_id, bombo) DO NOTHING;

-- Usuario 5: Pedro Sánchez - Selecciones de bombos
INSERT INTO porra.favorite_selections (user_id, group_id, team_id, bombo, puntos)
SELECT 
    'USER_ID_5',
    GROUP_ID,
    t.id,
    t.grupo,
    t.puntos_fifa
FROM porra.teams t
WHERE t.grupo IN ('A', 'B', 'E', 'F')
ORDER BY RANDOM()
LIMIT 4
ON CONFLICT (group_id, user_id, bombo) DO NOTHING;

-- ============================================
-- 5. VERIFICAR DATOS CREADOS
-- ============================================

-- Ver usuarios creados
SELECT id, name FROM porra.users WHERE id IN ('USER_ID_1', 'USER_ID_2', 'USER_ID_3', 'USER_ID_4', 'USER_ID_5');

-- Ver miembros del grupo
SELECT gm.user_id, u.name, gm.role 
FROM porra.group_members gm
JOIN porra.users u ON gm.user_id = u.id
WHERE gm.group_id = GROUP_ID;

-- Ver apuestas creadas
SELECT u.name, COUNT(*) as total_apuestas 
FROM porra.bets b
JOIN porra.users u ON b.user_id = u.id
WHERE b.group_id = GROUP_ID
GROUP BY u.id, u.name;

-- Ver selecciones de Pichichi
SELECT u.name, COUNT(*) as total_selecciones
FROM porra.favorite_selections fs
JOIN porra.users u ON fs.user_id = u.id
WHERE fs.group_id = GROUP_ID
GROUP BY u.id, u.name;

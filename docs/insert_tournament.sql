-- Script simple para insertar el torneo Mundial (WC)
-- Solo necesitas esto ya que sync-matches usará directamente los nombres de la API

INSERT INTO porra.tournaments (nombre, anio, external_code, estado, fecha_inicio, fecha_fin)
VALUES ('Mundial', 2026, 'WC', 'draft', '2026-06-11', '2026-07-19')
ON CONFLICT (external_code) DO NOTHING;

-- Verificar que se insertó correctamente
SELECT * FROM porra.tournaments WHERE external_code = 'WC';

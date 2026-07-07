# sync_matches_v2

Objetivo:

Sincronizar partidos de cualquier competición.

# Entrada

{
  "tournamentId": 1
}

# Flujo

Buscar tournament
↓
Obtener external_code
↓
Consultar API
↓
Resolver equipos usando team_aliases
↓
Actualizar partidos
↓
Actualizar last_sync_at

# Restricciones

No utilizar:

WC
EC

hardcodeados.

La función debe depender exclusivamente de la tabla tournaments.

# Mejoras

Utilizar table team_aliases para evitar mapas gigantes de traducción dentro del código.

Mantener un registro de sincronización mediante:

matches.last_sync_at
# sync-matches

Objetivo: sincronizar partidos de cualquier competición registrada en `porra.tournaments`.

# Entrada

Modo **un torneo** (Admin / invocación manual):

```json
{ "tournamentId": 2 }
```

Modo **batch / cron** (todos los torneos en BD):

```json
{}
```

# Flujo

```
Body recibido
    ↓
¿tournamentId presente?
    ├─ Sí → (opcional) verificar JWT + admin de porra con ese torneo
    │         → syncOneTournament(id)
    └─ No  → listar tournaments → syncOneTournament por cada fila (pausa 500 ms)
```

Por cada torneo:

1. Leer `external_code`, `nombre`, `anio` de `tournaments`
2. `GET /v4/competitions/{external_code}/matches?season={anio}`
3. Upsert en `teams` (nombres desde fixtures)
4. Upsert en `matches` (resultado a 90 min; prórroga/penaltis informativos)
5. Actualizar `tournaments.last_sync_at`

# Cron (Supabase Dashboard)

En **Edge Functions → sync-matches → Schedules**, usar body vacío:

```json
{}
```

No hardcodear `tournamentId: 1`. Así se sincronizan WC, EC y futuros torneos.

# Restricciones

- No hardcodear `WC` / `EC` en la función: depende exclusivamente de la tabla `tournaments`.
- La temporada la define `tournaments.anio` (query param `season` en football-data.org).
- Invocación desde el navegador requiere CORS y JWT de un admin de alguna porra del torneo.

# Respuesta

Un torneo:

```json
{
  "id": 2,
  "nombre": "European Championship",
  "matchCount": 51,
  "message": "Sincronizados 51 partidos de ..."
}
```

Batch:

```json
{
  "synced": [{ "id": 1, "nombre": "...", "matchCount": 104, "message": "..." }],
  "errors": [],
  "message": "Sincronizados 2 torneo(s), 0 error(es)."
}
```

# Cliente

- `api.js`: `syncMatches(tournamentId)` invoca la Edge Function.
- `admin.js`: auto-sync al abrir coeficientes si no hay partidos; botón **Sincronizar partidos**.

# Mejoras futuras

- Utilizar `team_aliases` para normalizar nombres API.
- Soportar varias ediciones del mismo `external_code` (p. ej. Euro 2024 vs 2028).

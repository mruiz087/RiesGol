# RiesGol

**RiesGol** es una aplicación web (PWA) de **porras privadas** para torneos internacionales de fútbol (Mundial, Eurocopa y similares). Cada porra tiene su propio grupo de amigos, código de invitación, apuestas 1-X-2, clasificación dinámica y competición **Pichichi** por equipos favoritos.

Stack: HTML/CSS/JS estático + [Supabase](https://supabase.com) (Auth, Postgres con esquema `porra`, Edge Functions).

## Funcionalidades

- **Mis Porras**: crear una porra o unirse con código.
- **Pichichi obligatorio**: al entrar, hay que elegir un equipo por bombo antes de usar el resto de la porra.
- **Partidos y apuestas**: predicción 1 / X / 2; se cierra al inicio del partido.
- **Clasificación**: puntos de apuestas + Pichichi; podio (1º, 2º, premio especial configurable, Premio Paquete).
- **Resultados**: partidos finalizados; desglose de votos; filtro por usuario (también desde la clasificación).
- **Admin** (creador/admin): miembros, estado del torneo, premio especial, coeficientes FIFA/bombos, sincronizar partidos.
- **Opciones**: nombre visible, normas de la porra, cerrar sesión.

## Cómo se usa

1. Registrarse o iniciar sesión.
2. En **Mis Porras**, crear una porra (elige torneo) o unirse con el código.
3. Completar **Pichichi** (un favorito por bombo).
4. Usar el menú: Clasificación, Partidos & Apuestas, Resultados, Admin (si aplica), Opciones.

## Reglas de puntuación

### Apuestas (1-X-2)

- Solo cuenta el resultado de los **90 minutos** (no prórroga ni penaltis).
- Quien **acierta** obtiene:  
  `(participantes que no acertaron) × multiplicador de fase`  
  Quien no apostó cuenta como fallo (0 puntos en ese partido).
- Sin apuesta en un partido cerrado: **0 pts** en ese partido y **no elegible** al Premio Paquete.

### Multiplicadores por fase

| Fase            | Multiplicador |
|-----------------|---------------|
| Fase de grupos  | ×1            |
| Dieciseisavos   | ×2            |
| Octavos         | ×3            |
| Cuartos         | ×4            |
| Semifinal       | ×5            |
| Final           | ×6            |

### Pichichi

- Cada jugador elige un equipo por bombo (valores/bombos los configura el admin).
- Por cada gol de un favorito en un partido finalizado:  
  `goles × multiplicador de fase × (FIFA máx. de la porra / FIFA del equipo)`.
- Los favoritos se pueden cambiar hasta el inicio del primer partido del torneo.

### Clasificación general

```
Total = puntos de apuestas + puntos Pichichi
```

**Premio Paquete** (último “oficial”): solo entre quienes han apostado en **todos** los partidos ya cerrados (por fecha de inicio). Fallar una apuesta no descalifica; **no apostar** sí.

## Estructura del proyecto

```
index.html          # SPA
css/styles.css
js/                 # auth, groups, matches, results, scoring, admin, …
supabase/functions/ # sync-matches, kick-member, delete-group, …
docs/               # reglas, flujos, SQL, Edge Functions
assets/             # iconos PWA
```

Configuración del cliente Supabase: [`js/supabase.js`](js/supabase.js) (URL y anon key).

## Arranque local

1. Sirve la carpeta raíz con cualquier servidor estático (por ejemplo `npx serve .`).
2. Asegúrate de que `js/supabase.js` apunta a tu proyecto Supabase.
3. Aplica las migraciones / SQL de [`docs/`](docs/) y [`docs/migrations/`](docs/migrations/) según tu entorno.
4. Despliega Edge Functions si usas sync de partidos, expulsar miembros, etc. (ver [`docs/11-edge-functions.md`](docs/11-edge-functions.md)).

## Documentación

Detalle de producto, modelo de datos y reglas en [`docs/`](docs/), en particular:

- [`docs/05-sistema-apuestas.md`](docs/05-sistema-apuestas.md)
- [`docs/06-sistema-puntuacion.md`](docs/06-sistema-puntuacion.md)
- [`docs/07-favoritos-y-pichichi.md`](docs/07-favoritos-y-pichichi.md)
- [`docs/CONTEXT.md`](docs/CONTEXT.md)

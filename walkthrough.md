# Walkthrough: Porra RiesGol (Mundial / Eurocopa) - Versión Final

He actualizado la aplicación para incluir la lógica de selección por Grupos y he detallado los pasos para configurar la API.

## Novedades

### 1. Lógica Pichichi por Grupos
- La tabla `teams` y `pichichi_teams` en Supabase ahora utilizan la columna `grupo` en lugar de una elección única global.
- En la interfaz, verás que los equipos se dividen en sus respectivos grupos (Grupo A, Grupo B...).
- Debes elegir **UN equipo por cada grupo**. Si ese equipo es eliminado del torneo, ya no sumará más goles a tu marcador.
- El cálculo del valor del gol se mantiene: `Puntos Favorito Global / Puntos de tu Equipo Seleccionado`.

### 2. Actualización de Base de Datos
- He actualizado el archivo [`supabase_schema.sql`](file:///c:/Users/marco/Desktop/RiesGol/supabase_schema.sql). 
- Si ya habías creado las tablas antes, bórralas en Supabase (`DROP TABLE teams CASCADE;` etc.) y vuelve a ejecutar el contenido del archivo `.sql` completo para que se generen con las nuevas restricciones (una apuesta de Pichichi por cada Grupo y Usuario).

---

## 🛠️ Instrucciones de Configuración API-Sports

Para que la aplicación sea "automantenida" y los partidos se actualicen automáticamente, vamos a usar **API-Sports**. Sigue estos pasos exactos:

1. **Crear Cuenta Gratis:**
   Ve a [api-sports.io](https://api-sports.io/) y haz clic en "Register" (o Dashboard). Crea una cuenta gratuita. El plan gratuito te permite hasta 100 peticiones al día, lo cual es más que suficiente para un torneo si haces 1 o 2 llamadas de actualización diarias.

2. **Obtener tu API Key:**
   Una vez dentro del Dashboard de API-Sports, en la sección de "Account" o "Profile", verás una clave alfanumérica llamada **API-Key**. Cópiala.

3. **Configurar en la App:**
   Abre el archivo [`js/api.js`](file:///c:/Users/marco/Desktop/RiesGol/js/api.js) y busca la línea 6:
   ```javascript
   const API_SPORTS_KEY = 'TU_API_KEY_AQUI';
   ```
   Reemplaza `'TU_API_KEY_AQUI'` por la clave que copiaste.

4. **Sincronizar Datos (Automantenimiento):**
   Actualmente he dejado creada la función `window.apiClient.syncMatchesFromExternalAPI(leagueId, season)` en el archivo [`api.js`](file:///c:/Users/marco/Desktop/RiesGol/js/api.js).
   *   `leagueId` es el ID de la competición (ej: la Eurocopa suele ser el ID `4`, y el Mundial el `1`).
   *   `season` es el año (ej: `2024` o `2026`).
   
   **¿Cómo se ejecuta automáticamente?**
   En PWA puras (cliente web), no es seguro ni posible usar Cron Jobs directamente en el navegador. La forma correcta de que sea "automantenida" sin que tú tengas que abrir la web es:
   1. Ve a **Supabase > Edge Functions**.
   2. Crea una función que haga el *fetch* a API-Sports y guarde los datos en tu tabla `matches` usando la lógica que te dejé comentada en `api.js`.
   3. Usa **Supabase pg_cron** (Cron Jobs integrados) para que esa Edge Function se llame sola cada 6 horas o al finalizar la jornada.
   
   De esta forma, cuando los usuarios abren la PWA de RiesGol, leen los partidos actualizados directamente desde Supabase en milisegundos, sin gastar el límite de tu API Key gratuita de API-Sports.

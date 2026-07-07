# Plan de Implementación: Actualización RiesGol (Fase 2)

En base a tus comentarios, vamos a actualizar la lógica y la estructura del proyecto.

## > [!IMPORTANT] Open Questions
1. **Selección de Pichichi:** Antes mencionaste "seleccionar 1 de cada bombo" y ahora que se basa en puntos FIFA. ¿El usuario elegirá **un único equipo** en total como su "Pichichi", o seguirá eligiendo varios (uno por bombo)? *Asumiré en este plan que se elige **un solo equipo** para simplificar, si son varios confírmamelo.*
2. **API de Datos:** Para la Opción A, utilizaremos la API **API-Sports (api-football)** que es la más robusta y tiene una capa gratuita (100 peticiones al día). Necesitarás crearte una cuenta gratuita en `api-sports.io` para obtener la API Key. ¿Te parece bien?

## Proposed Changes

### 1. Base de Datos (Supabase SQL Schema)
Dado que me has pedido que te cree las tablas, generaré un archivo `supabase_schema.sql` en tu carpeta del proyecto. 
Solo tendrás que copiar el contenido de ese archivo, ir al "SQL Editor" de tu panel de Supabase y ejecutarlo. Eso creará todas las tablas (`users`, `matches`, `bets`, `teams`, `pichichi_teams`) con sus relaciones y políticas de seguridad básicas.

### 2. Actualización de Lógica de Pichichi
Modificaremos `js/pichichi.js` y `js/scoring.js` para reflejar la nueva matemática:
*   En la tabla `teams` añadiremos la columna `puntos_fifa`.
*   **Cálculo de Valor de Gol:** `(Puntos FIFA del equipo con más puntos) / (Puntos FIFA del equipo seleccionado)`.
*   **Multiplicadores por Fase:**
    *   Fase de grupos y Dieciseisavos: x1
    *   Octavos: x3
    *   Cuartos: x4
    *   Semifinales: x5
    *   Final: x6
*   Modificaremos la vista de selección para mostrar el valor base de cada gol según el equipo.

### 3. Integración API Externa (Opción A)
Modificaremos `js/api.js` para integrarse con **API-Sports**. 
*   Crearé las funciones que harán `fetch` a `v3.football.api-sports.io`.
*   Dejaré un espacio para que introduzcas tu `API_KEY`.
*   Habrá una función administrativa oculta (o que puedas llamar desde consola) para volcar los datos de la API hacia tu base de datos de Supabase, logrando así que sea automantenida sin agotar el límite de tu API Key gratuita.

### 4. Interfaz del Dashboard (El Podio)
Actualizaremos `index.html`, `styles.css` y `scoring.js` para incluir el podio.
*   En la parte superior de la clasificación general (Dashboard), crearemos visualmente un podio.
*   Posición 1 (Oro, en el centro y más alto).
*   Posición 2 (Plata, a la izquierda).
*   Posición Último (Calavera/Bronce, a la derecha).
*   Posición 13 (Fantasma, flotando o al lado del último).
*   Debajo del podio, se renderizará la tabla de clasificación ordenada por puntos.

## Verification Plan

1. **SQL:** Te indicaré que ejecutes el SQL y verifiques que las tablas se han creado en Supabase.
2. **API:** Te pediré que introduzcas tu API Key en `api.js` y probaremos a cargar la lista de equipos y partidos reales.
3. **Cálculo Pichichi:** Haremos una prueba manual: Si Brasil tiene 1800 pts (el máximo) y un usuario elige a Japón (1200 pts). El valor del gol de Japón será `1800/1200 = 1.5`. Si marca en Cuartos (x4), sumará `1.5 * 4 = 6` puntos.
4. **Visualización:** Revisaremos que el Podio se ve correctamente y la tabla queda debajo.

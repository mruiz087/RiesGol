import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FOOTBALL_DATA_KEY = Deno.env.get("API_SPORTS_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    if (!FOOTBALL_DATA_KEY) throw new Error("Falta el API Key en las variables de entorno");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan credenciales de Supabase");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        db: { schema: 'porra' }
    });

    // Obtener tournamentId del body de la petición
    const { tournamentId } = await req.json();
    if (!tournamentId) throw new Error("Se requiere tournamentId");

    // Buscar tournament en la base de datos
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('external_code, nombre')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      throw new Error(`Torneo no encontrado: ${tournamentId}`);
    }

    console.log(`Sincronizando partidos para torneo: ${tournament.nombre} (${tournament.external_code})`);

    const response = await fetch(`https://api.football-data.org/v4/competitions/${tournament.external_code}/matches`, {
      method: "GET",
      headers: {
        "X-Auth-Token": FOOTBALL_DATA_KEY
      }
    });

    const data = await response.json();

    if (data.errorCode) {
      throw new Error(`Error de la API: ${data.message}`);
    }

    const fixtures = data.matches || [];
    console.log(`Se encontraron ${fixtures.length} partidos.`);

    if (fixtures.length === 0) {
      return new Response(JSON.stringify({ message: "No hay partidos disponibles todavía." }), { status: 200 });
    }

    // Obtener equipos para mapear nombres a IDs
    const { data: teams } = await supabase
      .from('teams')
      .select('id, nombre');

    // Mapeo: nombre -> team_id
    const teamMap: { [key: string]: number } = {};
    if (teams) {
      teams.forEach((team: any) => {
        teamMap[team.nombre] = team.id;
      });
    }

    const matchesToUpsert = fixtures.map((item: any) => {
      // Estado del partido
      let estado = 'pendiente';
      if (item.status === 'FINISHED') estado = 'finalizado';
      else if (item.status === 'IN_PLAY' || item.status === 'PAUSED' || item.status === 'HALFTIME') estado = 'en_juego';

      // Gestión de goles: para la PORRA cuenta el resultado del tiempo reglamentario (90 min)
      // Si hubo prórroga o penaltis, usamos regularTime como resultado oficial de la porra
      const scoreData = item.score || {};
      const duration = scoreData.duration || 'REGULAR';

      let golesLocal = null;
      let golesVisitante = null;
      let penaltisLocal = null;
      let penaltisVisitante = null;
      let resultadoProrrogaGanador = null;

      if (estado !== 'pendiente') {
        if (duration !== 'REGULAR' && scoreData.regularTime && scoreData.regularTime.home !== null) {
          // Resultado del tiempo reglamentario (lo que cuenta para la porra)
          golesLocal = scoreData.regularTime.home;
          golesVisitante = scoreData.regularTime.away;

          // Si hay prórroga, capturar quién ganó en fullTime
          if (scoreData.fullTime && scoreData.fullTime.home !== null) {
            if (scoreData.fullTime.home > scoreData.fullTime.away) {
              resultadoProrrogaGanador = 'local';
            } else if (scoreData.fullTime.away > scoreData.fullTime.home) {
              resultadoProrrogaGanador = 'visitante';
            }
            // Si son iguales después de prórroga, fue a penaltis (null)
          }
        } else {
          // Partido normal de 90 minutos
          golesLocal = scoreData.fullTime?.home ?? null;
          golesVisitante = scoreData.fullTime?.away ?? null;
        }

        // Penaltis (solo el resultado del shootout, no goles totales)
        if (scoreData.penalties && scoreData.penalties.home !== null) {
          penaltisLocal = scoreData.penalties.home;
          penaltisVisitante = scoreData.penalties.away;
        }
      }

      const localTeamName = item.homeTeam?.name || 'Por definir';
      const awayTeamName = item.awayTeam?.name || 'Por definir';

      return {
        external_api_id: item.id,
        equipo_local_nombre: localTeamName,
        equipo_visitante_nombre: awayTeamName,
        equipo_local_id: teamMap[localTeamName] || null,
        equipo_visitante_id: teamMap[awayTeamName] || null,
        tournament_id: tournamentId,
        fase: item.stage || 'GROUP_STAGE',
        fecha_inicio: item.utcDate,
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        estado: estado,
        duracion: duration,
        penaltis_local: penaltisLocal,
        penaltis_visitante: penaltisVisitante,
        resultado_prorroga_ganador: resultadoProrrogaGanador,
      };
    });

    const { error } = await supabase
      .from('matches')
      .upsert(matchesToUpsert, { onConflict: 'external_api_id' });

    if (error) throw error;

    // Actualizar last_sync_at del torneo
    await supabase
      .from('tournaments')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', tournamentId);

    return new Response(
      JSON.stringify({ message: `Sincronizados ${matchesToUpsert.length} partidos del torneo ${tournament.nombre} con éxito.` }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error en la Edge Function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
  }
});

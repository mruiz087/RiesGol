import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const FOOTBALL_DATA_KEY = Deno.env.get("API_SPORTS_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type TournamentRow = {
  id: number;
  external_code: string;
  nombre: string;
  anio: number;
};

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function assertTournamentAdmin(
  supabase: SupabaseClient,
  userId: string,
  tournamentId: number,
): Promise<boolean> {
  const { data: groups, error: groupsErr } = await supabase
    .from("groups")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (groupsErr || !groups?.length) return false;

  const groupIds = groups.map((g) => g.id);
  const { data: member, error: memberErr } = await supabase
    .from("group_members")
    .select("role")
    .in("group_id", groupIds)
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (memberErr) return false;
  return !!member;
}

async function updateLastSyncAt(
  supabase: SupabaseClient,
  tournamentId: number,
): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", tournamentId);

  if (error && !/last_sync_at/i.test(error.message || "")) {
    console.warn("updateLastSyncAt:", error.message);
  }
}

async function syncOneTournament(
  supabase: SupabaseClient,
  tournament: TournamentRow,
): Promise<{ id: number; nombre: string; matchCount: number; message: string }> {
  const tournamentId = tournament.id;
  const season = tournament.anio;
  const seasonParam = season ? `?season=${season}` : "";

  console.log(
    `Sincronizando partidos: ${tournament.nombre} (${tournament.external_code}, season=${season})`,
  );

  const response = await fetch(
    `https://api.football-data.org/v4/competitions/${tournament.external_code}/matches${seasonParam}`,
    {
      method: "GET",
      headers: { "X-Auth-Token": FOOTBALL_DATA_KEY! },
    },
  );

  const data = await response.json();

  if (data.errorCode) {
    throw new Error(`Error de la API (${tournament.external_code}): ${data.message}`);
  }

  const fixtures = data.matches || [];
  console.log(`  → ${fixtures.length} partidos encontrados.`);

  if (fixtures.length === 0) {
    await updateLastSyncAt(supabase, tournamentId);
    return {
      id: tournamentId,
      nombre: tournament.nombre,
      matchCount: 0,
      message: `No hay partidos disponibles para ${tournament.nombre} (season=${season}).`,
    };
  }

  const uniqueTeamNames = new Set<string>();
  fixtures.forEach((item: { homeTeam?: { name?: string }; awayTeam?: { name?: string } }) => {
    if (item.homeTeam?.name) uniqueTeamNames.add(item.homeTeam.name);
    if (item.awayTeam?.name) uniqueTeamNames.add(item.awayTeam.name);
  });

  const teamsPayload = [...uniqueTeamNames].map((nombre) => ({
    nombre,
    tournament_id: tournamentId,
  }));

  if (teamsPayload.length > 0) {
    const { error: teamsError } = await supabase
      .from("teams")
      .upsert(teamsPayload, { onConflict: "tournament_id,nombre", ignoreDuplicates: true });

    if (teamsError) {
      console.warn("Upsert teams fallback:", teamsError.message);
      for (const row of teamsPayload) {
        const { data: existing } = await supabase
          .from("teams")
          .select("id")
          .eq("tournament_id", tournamentId)
          .eq("nombre", row.nombre)
          .maybeSingle();
        if (!existing) {
          await supabase.from("teams").insert(row);
        }
      }
    }
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nombre")
    .eq("tournament_id", tournamentId);

  const teamMap: Record<string, number> = {};
  if (teams) {
    teams.forEach((team: { id: number; nombre: string }) => {
      teamMap[team.nombre] = team.id;
    });
  }

  const matchesToUpsert = fixtures.map((item: Record<string, unknown>) => {
    let estado = "pendiente";
    const status = item.status as string;
    if (status === "FINISHED") estado = "finalizado";
    else if (status === "IN_PLAY" || status === "PAUSED" || status === "HALFTIME") {
      estado = "en_juego";
    }

    const scoreData = (item.score || {}) as Record<string, unknown>;
    const duration = (scoreData.duration as string) || "REGULAR";

    let golesLocal: number | null = null;
    let golesVisitante: number | null = null;
    let golesLocalFt: number | null = null;
    let golesVisitanteFt: number | null = null;
    let penaltisLocal: number | null = null;
    let penaltisVisitante: number | null = null;
    let resultadoProrrogaGanador: string | null = null;

    if (estado !== "pendiente") {
      const regularTime = scoreData.regularTime as { home?: number; away?: number } | undefined;
      const fullTime = scoreData.fullTime as { home?: number; away?: number } | undefined;

      if (fullTime && fullTime.home != null && fullTime.away != null) {
        golesLocalFt = fullTime.home ?? null;
        golesVisitanteFt = fullTime.away ?? null;
      }

      if (duration !== "REGULAR" && regularTime && regularTime.home !== null) {
        golesLocal = regularTime.home ?? null;
        golesVisitante = regularTime.away ?? null;

        if (fullTime && fullTime.home !== null) {
          if (fullTime.home > fullTime.away!) {
            resultadoProrrogaGanador = "local";
          } else if (fullTime.away! > fullTime.home) {
            resultadoProrrogaGanador = "visitante";
          }
        }
      } else {
        golesLocal = fullTime?.home ?? null;
        golesVisitante = fullTime?.away ?? null;
        if (golesLocalFt == null) golesLocalFt = golesLocal;
        if (golesVisitanteFt == null) golesVisitanteFt = golesVisitante;
      }

      const penalties = scoreData.penalties as { home?: number; away?: number } | undefined;
      if (penalties && penalties.home !== null) {
        penaltisLocal = penalties.home ?? null;
        penaltisVisitante = penalties.away ?? null;
      }
    }

    const homeTeam = item.homeTeam as { name?: string } | undefined;
    const awayTeam = item.awayTeam as { name?: string } | undefined;
    const localTeamName = homeTeam?.name || "Por definir";
    const awayTeamName = awayTeam?.name || "Por definir";

    return {
      external_api_id: item.id,
      equipo_local_nombre: localTeamName,
      equipo_visitante_nombre: awayTeamName,
      equipo_local_id: teamMap[localTeamName] || null,
      equipo_visitante_id: teamMap[awayTeamName] || null,
      tournament_id: tournamentId,
      fase: item.stage || "GROUP_STAGE",
      fecha_inicio: item.utcDate,
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      goles_local_ft: golesLocalFt,
      goles_visitante_ft: golesVisitanteFt,
      estado,
      duracion: duration,
      penaltis_local: penaltisLocal,
      penaltis_visitante: penaltisVisitante,
      resultado_prorroga_ganador: resultadoProrrogaGanador,
    };
  });

  const { error } = await supabase
    .from("matches")
    .upsert(matchesToUpsert, { onConflict: "external_api_id" });

  if (error) throw error;

  await updateLastSyncAt(supabase, tournamentId);

  return {
    id: tournamentId,
    nombre: tournament.nombre,
    matchCount: matchesToUpsert.length,
    message: `Sincronizados ${matchesToUpsert.length} partidos de ${tournament.nombre}.`,
  };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!FOOTBALL_DATA_KEY) throw new Error("Falta el API Key en las variables de entorno");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Faltan credenciales de Supabase");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "porra" },
    });

    let body: { tournamentId?: number } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const tournamentId = body.tournamentId != null ? Number(body.tournamentId) : null;
    const token = getBearerToken(req);

    if (tournamentId != null && Number.isFinite(tournamentId) && token) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const isAdmin = await assertTournamentAdmin(supabase, authData.user.id, tournamentId);
      if (!isAdmin) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
    }

    if (tournamentId != null && Number.isFinite(tournamentId)) {
      const { data: tournament, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, external_code, nombre, anio")
        .eq("id", tournamentId)
        .single();

      if (tournamentError || !tournament) {
        throw new Error(`Torneo no encontrado: ${tournamentId}`);
      }

      const result = await syncOneTournament(supabase, tournament as TournamentRow);
      return jsonResponse({
        ...result,
        message: result.message,
      });
    }

    const { data: tournaments, error: listError } = await supabase
      .from("tournaments")
      .select("id, external_code, nombre, anio")
      .order("id", { ascending: true });

    if (listError) throw listError;
    if (!tournaments?.length) {
      return jsonResponse({ synced: [], errors: [], message: "No hay torneos en la base de datos." });
    }

    const synced: Array<{ id: number; nombre: string; matchCount: number; message: string }> = [];
    const errors: Array<{ id: number; nombre: string; error: string }> = [];

    for (let i = 0; i < tournaments.length; i++) {
      const t = tournaments[i] as TournamentRow;
      try {
        const result = await syncOneTournament(supabase, t);
        synced.push(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        console.error(`Error sync torneo ${t.id}:`, msg);
        errors.push({ id: t.id, nombre: t.nombre, error: msg });
      }
      if (i < tournaments.length - 1) await sleep(500);
    }

    return jsonResponse({
      synced,
      errors,
      message: `Sincronizados ${synced.length} torneo(s), ${errors.length} error(es).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("sync-matches:", message);
    return jsonResponse({ error: message }, 400);
  }
});

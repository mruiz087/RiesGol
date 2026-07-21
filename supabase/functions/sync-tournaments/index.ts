import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Competiciones: selecciones, UEFA clubes, Copa del Rey, Nations League.
// Candidatas descartadas (no existen en API v4): Women's CL, Copa de la Reina,
// códigos WWC/WEU/etc. Si el plan free no incluye CDR/UNL, el sync las salta.
const ALLOWED = [
  { code: "WC", tipo: "WORLD_CUP" },
  { code: "EC", tipo: "EURO" },
  { code: "CL", tipo: "CHAMPIONS" },
  { code: "EL", tipo: "EUROPA" },
  { code: "UCL", tipo: "CONFERENCE" },
  { code: "CDR", tipo: "COPA_DEL_REY" },
  { code: "UNL", tipo: "NATIONS_LEAGUE" },
];

function deriveEstado(startDate: string | null, endDate: string | null): string {
  const now = new Date();
  if (startDate) {
    const start = new Date(startDate);
    if (now < start) return "draft";
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) return "finished";
  }
  if (startDate) {
    const start = new Date(startDate);
    if (now >= start) return "active";
  }
  return "draft";
}

function extractYear(comp: Record<string, unknown>): number {
  const cs = comp.currentSeason as { startDate?: string } | undefined;
  if (cs?.startDate) return new Date(cs.startDate).getFullYear();
  const name = String(comp.name || "");
  const match = name.match(/\d{4}/);
  if (match) return parseInt(match[0], 10);
  return new Date().getFullYear();
}

function toTimestamptz(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00Z`).toISOString();
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

    const upserted: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const { code, tipo } of ALLOWED) {
      const response = await fetch(
        `https://api.football-data.org/v4/competitions/${code}`,
        {
          method: "GET",
          headers: { "X-Auth-Token": FOOTBALL_DATA_KEY },
        },
      );

      const comp = await response.json();

      if (!response.ok || comp.errorCode) {
        const msg = comp.message || comp.error || `HTTP ${response.status}`;
        // 403 = competición restringida al plan; 404 = no existe → se omite
        console.warn(`Skip ${code} (${response.status}):`, msg);
        continue;
      }

      const cs = comp.currentSeason || {};
      const fechaInicio = toTimestamptz(cs.startDate);
      const fechaFin = toTimestamptz(cs.endDate);
      const anio = extractYear(comp);
      const estado = deriveEstado(cs.startDate || null, cs.endDate || null);

      const row = {
        external_code: code,
        nombre: comp.name || code,
        tipo,
        anio,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado,
        last_sync_at: now,
      };

      const { data, error } = await supabase
        .from("tournaments")
        .upsert(row, { onConflict: "external_code" })
        .select()
        .single();

      if (error) {
        // Fallback si last_sync_at aún no existe en BD
        if (/last_sync_at/i.test(error.message || "")) {
          const { last_sync_at: _, ...rowWithoutSync } = row;
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("tournaments")
            .upsert(rowWithoutSync, { onConflict: "external_code" })
            .select()
            .single();
          if (fallbackError) throw fallbackError;
          if (fallbackData) upserted.push(fallbackData);
        } else {
          throw error;
        }
      } else if (data) {
        upserted.push(data);
      }
    }

    return jsonResponse({ tournaments: upserted, count: upserted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("sync-tournaments:", message);
    return jsonResponse({ error: message }, 500);
  }
});

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function getBearerToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan credenciales de Supabase");

    const token = getBearerToken(req);
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "porra" } });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const actorId = authData.user.id;
    const { groupId } = await req.json();
    if (!groupId) throw new Error("Se requiere groupId");

    const { data: actorMember, error: actorErr } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", actorId)
      .maybeSingle();

    if (actorErr) throw actorErr;
    if (!actorMember || actorMember.role !== "admin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { error: delErr } = await supabase.from("groups").delete().eq("id", groupId);
    if (delErr) throw delErr;

    return jsonResponse({ ok: true });
  } catch (error: any) {
    console.error("delete-group error:", error?.message || error);
    return jsonResponse({ error: error?.message || "Error" }, 400);
  }
});

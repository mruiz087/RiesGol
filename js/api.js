// js/api.js
// Interfaz para comunicarse con la base de datos de partidos y API externa (API-Sports).

// NOTA PARA EL USUARIO: Para la integración directa, añade tu API key de api-sports.io aquí.
// Sin embargo, para mayor seguridad en producción, esto debería hacerse desde Supabase Edge Functions.
const API_SPORTS_KEY = 'TU_API_KEY_AQUI';

// Caché simple en memoria
const cache = {
    tournaments: null,
    teams: null,
    groupTeamValues: null,
    cacheTime: null,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutos
};

const API = {
    // Obtener todos los partidos de Supabase
    getMatches: async (tournamentId = null, groupId = null) => {
        if (!window.supabaseClient) return [];
        
        let query = window.supabaseClient
            .from('matches')
            .select('*');
        
        if (tournamentId) {
            query = query.eq('tournament_id', tournamentId);
        }
        
        const { data, error } = await query.order('fecha_inicio', { ascending: true });
        
        if (error) {
            console.error("Error obteniendo partidos:", error);
            return [];
        }
        return data;
    },

    // Obtener equipos de Supabase (con caché). Si hay soporte multi-torneo,
    // filtra por tournamentId; si no, cae al comportamiento legacy.
    getTeams: async (tournamentId = null) => {
        if (!window.supabaseClient) return [];
        
        // Verificar caché
        const now = Date.now();
        const cacheKey = tournamentId ? `t:${tournamentId}` : 'all';
        if (cache.teams?.[cacheKey] && cache.cacheTime && (now - cache.cacheTime) < cache.CACHE_DURATION) {
            return cache.teams[cacheKey];
        }

        // Preparar query
        let query = window.supabaseClient
            .from('teams')
            .select('*')
            .order('nombre', { ascending: true });

        if (tournamentId) {
            query = query.eq('tournament_id', tournamentId);
        }

        let data = null;
        let error = null;

        ({ data, error } = await query);

        if (error && tournamentId && /tournament_id/i.test(error.message || '')) {
            ({ data, error } = await window.supabaseClient
                .from('teams')
                .select('*')
                .order('nombre', { ascending: true }));
        }

        if (error) {
            console.error("Error obteniendo equipos:", error);
            return [];
        }

        // Actualizar caché
        if (!cache.teams) cache.teams = {};
        cache.teams[cacheKey] = data;
        cache.cacheTime = now;

        return data;
    },

    // Obtener todos los equipos de Supabase (legacy)
    getTeamsLegacy: async () => {
        return await API.getTeams(null);
    },

    // ------------------------------------------------------------
    // Nota: la implementación anterior de getTeams fue reemplazada.
    // ------------------------------------------------------------

    // Obtener todos los torneos (con caché)
    getTournaments: async () => {
        if (!window.supabaseClient) return [];
        
        // Verificar caché
        const now = Date.now();
        if (cache.tournaments && cache.cacheTime && (now - cache.cacheTime) < cache.CACHE_DURATION) {
            return cache.tournaments;
        }
        
        const { data, error } = await window.supabaseClient
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error obteniendo torneos:", error);
            return [];
        }
        
        // Actualizar caché
        cache.tournaments = data;
        cache.cacheTime = now;
        
        return data;
    },

    // Sincronizar torneos disponibles (WC + EC) desde football-data.org
    syncAvailableTournaments: async () => {
        if (!window.supabaseClient) {
            return { tournaments: [], error: 'Supabase no configurado' };
        }

        const result = await API.invokeEdgeFunction('sync-tournaments', {});
        if (result.error) {
            return { tournaments: [], error: result.error };
        }

        API.clearCache();
        const tournaments = await API.getTournaments();
        return { tournaments, error: null };
    },

    // Sincronizar partidos de un torneo desde football-data.org (Edge Function)
    syncMatches: async (tournamentId) => {
        if (!window.supabaseClient || !tournamentId) {
            return { error: 'Torneo no especificado' };
        }

        const result = await API.invokeEdgeFunction('sync-matches', {
            tournamentId: Number(tournamentId)
        });

        if (result.error) {
            return { error: result.error };
        }

        API.clearCache();

        const data = result.data || {};
        return {
            success: true,
            message: data.message || 'Partidos sincronizados',
            matchCount: data.matchCount ?? 0
        };
    },

    // Apuestas de toda la porra (RPC public security definer + fallback SELECT).
    getGroupBets: async (groupId) => {
        if (!window.supabaseClient || groupId == null || groupId === '') return [];

        const gidNum = Number(groupId);
        const gid = Number.isFinite(gidNum) ? gidNum : groupId;
        const byKey = new Map();
        const merge = (rows) => {
            (rows || []).forEach((b) => {
                if (!b) return;
                const key = b.id != null
                    ? `id:${b.id}`
                    : `${String(b.user_id)}|${String(b.match_id)}`;
                byKey.set(key, {
                    id: b.id,
                    user_id: b.user_id,
                    match_id: b.match_id,
                    group_id: b.group_id,
                    prediccion: b.prediccion,
                    fecha_apuesta: b.fecha_apuesta,
                });
            });
        };

        const normalizeRpcPayload = (data) => {
            if (data == null) return [];
            if (Array.isArray(data)) return data;
            if (typeof data === 'string') {
                try {
                    const parsed = JSON.parse(data);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (_) {
                    return [];
                }
            }
            // jsonb object that is already an array-like
            if (typeof data === 'object') return Array.isArray(data) ? data : [];
            return [];
        };

        // 1) RPC en schema public (migración 2026-07-19)
        const publicClient = window.supabasePublicClient;
        if (publicClient && Number.isFinite(gidNum)) {
            const { data, error } = await publicClient.rpc('get_group_bets', { p_group_id: gidNum });
            if (!error) {
                const rows = normalizeRpcPayload(data);
                merge(rows);
                const users = new Set(rows.map((b) => String(b.user_id)));
                console.log('[getGroupBets] via public.rpc:', rows.length, 'users=', users.size);
                if (rows.length > 0) return Array.from(byKey.values());
            } else {
                console.warn('[getGroupBets] public.rpc falló:', error.message || error);
            }
        }

        // 2) RPC en schema porra
        if (Number.isFinite(gidNum)) {
            const { data, error } = await window.supabaseClient.rpc('get_group_bets', { p_group_id: gidNum });
            if (!error) {
                const rows = normalizeRpcPayload(data);
                merge(rows);
                console.log('[getGroupBets] via porra.rpc:', rows.length);
                if (rows.length > 0) return Array.from(byKey.values());
            } else {
                console.warn('[getGroupBets] porra.rpc falló:', error.message || error);
            }
        }

        // 3) SELECT directo
        const selects = await Promise.all([
            window.supabaseClient
                .from('bets')
                .select('id, user_id, match_id, group_id, prediccion, fecha_apuesta')
                .eq('group_id', gid),
            window.supabaseClient
                .from('bets')
                .select('id, user_id, match_id, group_id, prediccion, fecha_apuesta')
                .eq('group_id', groupId),
        ]);
        selects.forEach((res, idx) => {
            if (res.error) {
                console.warn(`[getGroupBets] select[${idx}]:`, res.error.message || res.error);
                return;
            }
            merge(res.data);
        });

        const me = window.getCurrentUser?.() || window.currentUser;
        if (me?.id) {
            const { data: mine } = await window.supabaseClient
                .from('bets')
                .select('id, user_id, match_id, group_id, prediccion, fecha_apuesta')
                .eq('user_id', me.id)
                .eq('group_id', groupId);
            merge(mine);
        }

        const users = new Set([...byKey.values()].map((b) => String(b.user_id)));
        console.log('[getGroupBets] via SELECT:', byKey.size, 'users=', users.size, 'groupId=', groupId);
        if (users.size <= 1) {
            console.warn('[getGroupBets] Solo se ven apuestas de', users.size, 'usuario(s). Ejecuta la migración SQL.');
        }
        return Array.from(byKey.values());
    },

    // Valores/bombos configurados por porra
    getGroupTeamValues: async (groupId) => {
        if (!window.supabaseClient || !groupId) return [];

        const cacheKey = `g:${groupId}`;
        const now = Date.now();
        if (cache.groupTeamValues?.[cacheKey] && cache.cacheTime && (now - cache.cacheTime) < cache.CACHE_DURATION) {
            return cache.groupTeamValues[cacheKey];
        }

        const { data, error } = await window.supabaseClient
            .from('group_team_values')
            .select('*, teams(id, nombre)')
            .eq('group_id', groupId);

        if (error) {
            console.error('Error obteniendo group_team_values:', error);
            return [];
        }

        if (!cache.groupTeamValues) cache.groupTeamValues = {};
        cache.groupTeamValues[cacheKey] = data || [];
        cache.cacheTime = now;
        return data || [];
    },

    upsertGroupTeamValues: async (groupId, rows) => {
        if (!window.supabaseClient || !groupId) return { error: 'Datos incompletos' };

        const payload = rows.map(r => ({
            group_id: groupId,
            team_id: r.team_id,
            valor: r.valor,
            bombo: r.bombo,
            updated_at: new Date().toISOString()
        }));

        const { error: directError } = await window.supabaseClient
            .from('group_team_values')
            .upsert(payload, { onConflict: 'group_id,team_id' });

        if (!directError) {
            API.clearCache();
            return { success: true, count: rows.length };
        }

        const isPermissionError = /permission|policy|42501|403|Forbidden/i.test(directError.message || '');
        if (!isPermissionError) {
            console.error('Error guardando group_team_values:', directError);
            return { error: directError.message || 'Error al guardar' };
        }

        // Fallback: Edge Function con service role (requiere despliegue)
        const { data, error: fnError } = await window.supabaseClient.functions.invoke('upsert-group-team-values', {
            body: { groupId, rows }
        });

        if (fnError) {
            console.error('Error guardando group_team_values (directo y función):', directError, fnError);
            return {
                error: 'Sin permisos para guardar. Ejecuta docs/migrations/2026-07-13_fix_group_team_values_rls.sql en Supabase.'
            };
        }

        if (data?.error) {
            return { error: data.error };
        }

        API.clearCache();
        return { success: true, count: data?.count ?? rows.length };
    },

    // Asegurar filas en teams a partir de nombres en matches del torneo
    ensureTeamsFromMatches: async (tournamentId) => {
        if (!window.supabaseClient || !tournamentId) return { inserted: 0 };

        const matches = await API.getMatches(tournamentId);
        const names = new Set();

        matches.forEach(m => {
            if (m.equipo_local_nombre && m.equipo_local_nombre !== 'Por definir') {
                names.add(m.equipo_local_nombre.trim());
            }
            if (m.equipo_visitante_nombre && m.equipo_visitante_nombre !== 'Por definir') {
                names.add(m.equipo_visitante_nombre.trim());
            }
        });

        if (names.size === 0) return { inserted: 0 };

        const payload = [...names].map(nombre => ({ nombre, tournament_id: tournamentId }));
        const { error } = await window.supabaseClient
            .from('teams')
            .upsert(payload, { onConflict: 'tournament_id,nombre', ignoreDuplicates: true });

        if (error) {
            console.warn('ensureTeamsFromMatches:', error.message);
            // Fallback: insertar uno a uno si el upsert compuesto falla
            let inserted = 0;
            for (const row of payload) {
                const { data: existing } = await window.supabaseClient
                    .from('teams')
                    .select('id')
                    .eq('tournament_id', tournamentId)
                    .eq('nombre', row.nombre)
                    .maybeSingle();
                if (!existing) {
                    const { error: insErr } = await window.supabaseClient
                        .from('teams')
                        .insert(row);
                    if (!insErr) inserted++;
                }
            }
            API.clearCache();
            return { inserted };
        }

        API.clearCache();
        return { inserted: payload.length };
    },

    mergeTeamsWithGroupValues: (teams, groupValues) => {
        const byTeamId = {};
        (groupValues || []).forEach(gv => {
            byTeamId[gv.team_id] = gv;
        });

        return (teams || []).map(team => {
            const cfg = byTeamId[team.id];
            return {
                ...team,
                valor: cfg ? Number(cfg.valor) : null,
                bombo: cfg?.bombo || null
            };
        });
    },

    // Limpiar caché (útil después de actualizaciones)
    clearCache: () => {
        cache.teams = null;
        cache.tournaments = null;
        cache.groupTeamValues = null;
        cache.cacheTime = null;
    },

    // Obtener torneo por ID
    getTournament: async (tournamentId) => {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();
        
        if (error) {
            console.error("Error obteniendo torneo:", error);
            return null;
        }
        return data;
    },

    // Obtener grupos (porras) del usuario
    getUserGroups: async (userId) => {
        if (!window.supabaseClient) return [];
        const { data, error } = await window.supabaseClient
            .from('group_members')
            .select(`
                group_id,
                role,
                groups (
                    id,
                    nombre,
                    codigo,
                    tournament_id,
                    tournaments (
                        id,
                        nombre,
                        estado
                    )
                )
            `)
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error obteniendo grupos del usuario:", error);
            return [];
        }
        return data;
    },

    // Crear un nuevo grupo (porra)
    createGroup: async (nombre, tournamentId, userId) => {
        if (!window.supabaseClient) return { error: 'Supabase no configurado' };
        
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data: group, error: groupError } = await window.supabaseClient
            .from('groups')
            .insert({
                nombre,
                tournament_id: tournamentId,
                created_by: userId,
                codigo
            })
            .select()
            .single();
        
        if (groupError) {
            console.error("Error creando grupo:", groupError);
            return { error: groupError.message || 'Error creando la porra' };
        }
        
        const { error: memberError } = await window.supabaseClient
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'admin'
            });
        
        if (memberError) {
            console.error("Error añadiendo admin al grupo:", memberError);
            // Limpiar porra huérfana si falló el alta del miembro
            await window.supabaseClient.from('groups').delete().eq('id', group.id);
            return { error: memberError.message || 'Error añadiendo admin a la porra' };
        }
        
        return { group };
    },

    // Unirse a un grupo por código
    joinGroupByCode: async (codigo, userId) => {
        if (!window.supabaseClient) return null;
        
        // Buscar el grupo por código
        const { data: group, error: groupError } = await window.supabaseClient
            .from('groups')
            .select(`
                *,
                tournaments (
                    estado
                )
            `)
            .eq('codigo', codigo)
            .single();
        
        if (groupError || !group) {
            console.error("Grupo no encontrado:", groupError);
            return { error: 'Código inválido' };
        }
        
        // Verificar que el torneo no ha comenzado
        if (group.tournaments.estado === 'active' || group.tournaments.estado === 'finished') {
            return { error: 'El torneo ya ha comenzado' };
        }
        
        // Verificar si el usuario ya está en el grupo
        const { data: existingMember } = await window.supabaseClient
            .from('group_members')
            .select('*')
            .eq('group_id', group.id)
            .eq('user_id', userId)
            .single();
        
        if (existingMember) {
            return { error: 'Ya eres miembro de esta porra' };
        }
        
        // Añadir al usuario como member
        const { error: memberError } = await window.supabaseClient
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'member'
            });
        
        if (memberError) {
            console.error("Error uniéndose al grupo:", memberError);
            return { error: 'Error al unirse al grupo' };
        }
        
        return { success: true, group };
    },

    // Obtener miembros de un grupo
    getGroupMembers: async (groupId) => {
        if (!window.supabaseClient) return [];
        const { data, error } = await window.supabaseClient
            .from('group_members')
            .select(`
                user_id,
                role,
                joined_at,
                users (
                    id,
                    name
                )
            `)
            .eq('group_id', groupId);
        
        if (error) {
            console.error("Error obteniendo miembros del grupo:", error);
            return [];
        }
        return data;
    },

    // Helper: invocar Edge Function y extraer mensaje de error real
    invokeEdgeFunction: async (name, body) => {
        if (!window.supabaseClient) return { error: 'Supabase no configurado' };

        const { data, error } = await window.supabaseClient.functions.invoke(name, { body });

        if (data?.error) return { error: data.error };

        if (error) {
            let message = error.message || 'Error en Edge Function';
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const payload = await error.context.json();
                    if (payload?.error) message = payload.error;
                }
            } catch (_) { /* ignore parse errors */ }
            console.error(`Edge Function ${name}:`, message, error);
            return { error: message };
        }

        return { success: true, data };
    },

    // Expulsar usuario (solo admins) vía Edge Function
    kickMember: async (groupId, userIdToKick) => {
        const result = await API.invokeEdgeFunction('kick-member', { groupId: Number(groupId), userIdToKick });
        if (result.success) return { success: true, data: result.data };
        return { error: result.error || 'Error expulsando miembro' };
    },

    // Eliminar porra (solo admins) — Edge Function o borrado directo
    deleteGroup: async (groupId) => {
        const gid = Number(groupId);
        if (!Number.isFinite(gid) || gid <= 0) return { error: 'Porra inválida' };

        const fnResult = await API.invokeEdgeFunction('delete-group', { groupId: gid });
        if (fnResult.success) return { success: true, data: fnResult.data };

        const fnUnavailable = /failed to send|edge function|fetch|not found|404/i.test(fnResult.error || '');
        if (!fnUnavailable) return { error: fnResult.error };

        const { error } = await window.supabaseClient
            .from('groups')
            .delete()
            .eq('id', gid);

        if (error) return { error: error.message || 'No se pudo eliminar la porra' };
        return { success: true };
    },

    // Actualizar premio especial del grupo (RPC admin + fallback UPDATE)
    updateSpecialPrize: async (groupId, enabled, position) => {
        if (!window.supabaseClient) return { success: false, error: 'Sin conexión' };

        const gidNum = Number(groupId);
        const gid = Number.isFinite(gidNum) ? gidNum : groupId;
        const payload = {
            special_prize_enabled: !!enabled,
            special_position: enabled ? Number(position) : null
        };

        const normalizeRpc = (data) => {
            if (data == null) return null;
            if (typeof data === 'string') {
                try { return JSON.parse(data); } catch (_) { return null; }
            }
            return data;
        };

        // 1) RPC public (migración 2026-07-20)
        const publicClient = window.supabasePublicClient;
        if (publicClient && Number.isFinite(gidNum)) {
            const { data, error } = await publicClient.rpc('update_special_prize', {
                p_group_id: gidNum,
                p_enabled: !!enabled,
                p_position: enabled ? Number(position) : null,
            });
            if (!error) {
                const row = normalizeRpc(data);
                if (row && (row.id != null || row.special_prize_enabled != null)) {
                    return { success: true, data: row };
                }
            } else {
                console.warn('[updateSpecialPrize] public.rpc:', error.message || error);
            }
        }

        // 2) RPC porra
        if (Number.isFinite(gidNum)) {
            const { data, error } = await window.supabaseClient.rpc('update_special_prize', {
                p_group_id: gidNum,
                p_enabled: !!enabled,
                p_position: enabled ? Number(position) : null,
            });
            if (!error) {
                const row = normalizeRpc(data);
                if (row && (row.id != null || row.special_prize_enabled != null)) {
                    return { success: true, data: row };
                }
            } else {
                console.warn('[updateSpecialPrize] porra.rpc:', error.message || error);
            }
        }

        // 3) UPDATE directo
        const { data, error } = await window.supabaseClient
            .from('groups')
            .update(payload)
            .eq('id', gid)
            .select('id, special_prize_enabled, special_position')
            .maybeSingle();

        if (error) {
            console.error('Error actualizando premio especial:', error);
            return {
                success: false,
                error: error.message || 'Error al guardar. Ejecuta docs/migrations/2026-07-20_groups_special_prize_rls.sql',
            };
        }

        if (!data) {
            console.error('Premio especial: update sin filas (¿RLS o groupId incorrecto?)', { groupId, payload });
            return {
                success: false,
                error: 'No se pudo guardar. Ejecuta en Supabase: docs/migrations/2026-07-20_groups_special_prize_rls.sql',
            };
        }

        return { success: true, data };
    },

    getScoringRules: async (groupId) => {
        if (!window.supabaseClient || groupId == null) {
            return window.ScoringRules?.getDefaultScoringRules?.() || {};
        }
        const { data, error } = await window.supabaseClient
            .from('groups')
            .select('scoring_rules')
            .eq('id', groupId)
            .maybeSingle();
        if (error) {
            console.warn('[getScoringRules]', error.message || error);
            return window.ScoringRules?.getDefaultScoringRules?.() || {};
        }
        return window.ScoringRules?.normalizeScoringRules?.(data?.scoring_rules) || data?.scoring_rules || {};
    },

    updateScoringRules: async (groupId, rules) => {
        if (!window.supabaseClient) return { success: false, error: 'Sin conexión' };
        const gidNum = Number(groupId);
        const payload = window.ScoringRules?.normalizeScoringRules?.(rules) || rules;

        const publicClient = window.supabasePublicClient;
        if (publicClient && Number.isFinite(gidNum)) {
            const { data, error } = await publicClient.rpc('update_scoring_rules', {
                p_group_id: gidNum,
                p_rules: payload,
            });
            if (!error && data) {
                return { success: true, data };
            }
            if (error) console.warn('[updateScoringRules] rpc:', error.message || error);
        }

        const { data, error } = await window.supabaseClient
            .from('groups')
            .update({ scoring_rules: payload })
            .eq('id', groupId)
            .select('id, scoring_rules')
            .maybeSingle();

        if (error) {
            return {
                success: false,
                error: error.message || 'Error al guardar. Ejecuta docs/migrations/2026-07-20_group_scoring_rules.sql',
            };
        }
        if (!data) {
            return {
                success: false,
                error: 'No se pudo guardar. Ejecuta docs/migrations/2026-07-20_group_scoring_rules.sql en Supabase.',
            };
        }
        return { success: true, data };
    },

    // Actualizar estado de torneo
    updateTournamentStatus: async (tournamentId, status) => {
        if (!window.supabaseClient) return false;
        
        const { error } = await window.supabaseClient
            .from('tournaments')
            .update({ estado: status })
            .eq('id', tournamentId);
        
        if (error) {
            console.error("Error actualizando estado del torneo:", error);
            return false;
        }
        return true;
    },

    // Sincronización manual/admin desde API-Sports hacia Supabase
    // Esta función llama a la API externa y actualiza la base de datos
    syncMatchesFromExternalAPI: async (leagueId = 4, season = 2024) => {
        console.log("Iniciando sincronización con API-Sports...");
        if (API_SPORTS_KEY === 'TU_API_KEY_AQUI') {
            console.warn("Falta configurar la API Key de API-Sports.");
            return;
        }

        try {
            const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`, {
                method: "GET",
                headers: {
                    "x-rapidapi-host": "v3.football.api-sports.io",
                    "x-apisports-key": API_SPORTS_KEY
                }
            });

            const data = await response.json();
            
            if (data.errors && Object.keys(data.errors).length > 0) {
                console.error("Error de API-Sports:", data.errors);
                return;
            }

            const fixtures = data.response;
            console.log(`Obtenidos ${fixtures.length} partidos. Preparando inserción/actualización...`);

            // Procesar y enviar a Supabase
            // Esta lógica dependería de cómo mapees los IDs de equipos.
            // Es un ejemplo de la estructura.
            
            /*
            for (const item of fixtures) {
                const matchData = {
                    external_api_id: item.fixture.id,
                    equipo_local_nombre: item.teams.home.name,
                    equipo_visitante_nombre: item.teams.away.name,
                    fase: item.league.round,
                    fecha_inicio: item.fixture.date,
                    goles_local: item.goals.home,
                    goles_visitante: item.goals.away,
                    estado: item.fixture.status.short === 'FT' ? 'finalizado' : 'pendiente'
                };
                
                await window.supabaseClient.from('matches').upsert(matchData, { onConflict: 'external_api_id' });
            }
            console.log("Sincronización completada.");
            */
            
        } catch (err) {
            console.error("Error en el fetch a API-Sports:", err);
        }
    }
};

window.apiClient = API;

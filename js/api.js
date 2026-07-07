// js/api.js
// Interfaz para comunicarse con la base de datos de partidos y API externa (API-Sports).

// NOTA PARA EL USUARIO: Para la integración directa, añade tu API key de api-sports.io aquí.
// Sin embargo, para mayor seguridad en producción, esto debería hacerse desde Supabase Edge Functions.
const API_SPORTS_KEY = 'TU_API_KEY_AQUI';

// Caché simple en memoria
const cache = {
    tournaments: null,
    teams: null,
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

    // Obtener todos los equipos de Supabase (con caché)
    getTeams: async () => {
        if (!window.supabaseClient) return [];
        
        // Verificar caché
        const now = Date.now();
        if (cache.teams && cache.cacheTime && (now - cache.cacheTime) < cache.CACHE_DURATION) {
            return cache.teams;
        }
        
        const { data, error } = await window.supabaseClient
            .from('teams')
            .select('*')
            .order('puntos_fifa', { ascending: false });
            
        if (error) {
            console.error("Error obteniendo equipos:", error);
            return [];
        }
        
        // Actualizar caché
        cache.teams = data;
        cache.cacheTime = now;
        
        return data;
    },

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

    // Limpiar caché (útil después de actualizaciones)
    clearCache: () => {
        cache.teams = null;
        cache.tournaments = null;
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
        if (!window.supabaseClient) return null;
        
        // Generar código único de 6 caracteres
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Crear el grupo
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
            return null;
        }
        
        // Añadir al creador como admin
        const { error: memberError } = await window.supabaseClient
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'admin'
            });
        
        if (memberError) {
            console.error("Error añadiendo admin al grupo:", memberError);
            return null;
        }
        
        return group;
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

    // Promover usuario a admin
    promoteToAdmin: async (groupId, userId) => {
        if (!window.supabaseClient) return false;
        const { error } = await window.supabaseClient
            .from('group_members')
            .update({ role: 'admin' })
            .eq('group_id', groupId)
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error promoviendo a admin:", error);
            return false;
        }
        return true;
    },

    // Degradar admin a member
    demoteFromAdmin: async (groupId, userId) => {
        if (!window.supabaseClient) return false;
        const { error } = await window.supabaseClient
            .from('group_members')
            .update({ role: 'member' })
            .eq('group_id', groupId)
            .eq('user_id', userId);
        
        if (error) {
            console.error("Error degradando a member:", error);
            return false;
        }
        return true;
    },

    // Actualizar premio especial del grupo
    updateSpecialPrize: async (groupId, enabled, position) => {
        if (!window.supabaseClient) return false;
        const { error } = await window.supabaseClient
            .from('groups')
            .update({
                special_prize_enabled: enabled,
                special_position: enabled ? position : null
            })
            .eq('id', groupId);
        
        if (error) {
            console.error("Error actualizando premio especial:", error);
            return false;
        }
        return true;
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

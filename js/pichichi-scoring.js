// js/pichichi-scoring.js
// Cálculo compartido de puntos Pichichi (partidos + clasificación)

const PHASE_MULTIPLIERS = {
    'GROUP_STAGE': 1,
    'LAST_32': 2,
    'LAST_16': 3,
    'ROUND_OF_16': 3,
    'QUARTER_FINALS': 4,
    'SEMI_FINALS': 5,
    'FINAL': 6
};

function round2(n) {
    return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeName(name) {
    if (!name) return '';
    return name.trim().toLowerCase();
}

function getPhaseMultiplier(fase) {
    if (!fase) return 1;
    if (PHASE_MULTIPLIERS[fase]) return PHASE_MULTIPLIERS[fase];
    const key = fase.toUpperCase().replace(/ /g, '_');
    return PHASE_MULTIPLIERS[key] || 1;
}

function getSelectionTeamId(selection) {
    if (!selection) return null;
    const id = selection.equipo_id ?? selection.team_id;
    if (id != null && id !== '') {
        const num = Number(id);
        if (Number.isFinite(num) && num > 0) return num;
    }
    if (selection.teams?.id != null) {
        const num = Number(selection.teams.id);
        if (Number.isFinite(num) && num > 0) return num;
    }
    return null;
}

function getSelectionFifaPoints(selection, teamsFifaMap) {
    if (selection.teams?.puntos_fifa) return selection.teams.puntos_fifa;
    const teamId = getSelectionTeamId(selection);
    if (teamId && teamsFifaMap) {
        return teamsFifaMap[teamId] ?? teamsFifaMap[String(teamId)] ?? 1000;
    }
    return 1000;
}

function getSelectionTeamName(selection) {
    return selection.teams?.nombre || 'Equipo';
}

/**
 * Construye mapas auxiliares desde listas de equipos y aliases.
 * teamsFifaMap: teamId -> puntos_fifa
 * teamsNameToId: nombre normalizado -> teamId
 * aliasMap: api_name normalizado -> teamId
 */
function buildTeamMaps(teams, aliases) {
    const teamsFifaMap = {};
    const teamsNameToId = {};
    const translations = window.TEAM_NAME_TRANSLATIONS || {};

    if (teams) {
        teams.forEach(t => {
            teamsFifaMap[t.id] = t.puntos_fifa;
            teamsFifaMap[String(t.id)] = t.puntos_fifa;
            if (t.nombre) {
                teamsNameToId[normalizeName(t.nombre)] = t.id;
                for (const [enName, esName] of Object.entries(translations)) {
                    if (esName === t.nombre) {
                        teamsNameToId[normalizeName(enName)] = t.id;
                    }
                }
            }
        });
    }

    const aliasMap = {};
    if (aliases) {
        aliases.forEach(a => {
            if (a.api_name) {
                aliasMap[normalizeName(a.api_name)] = a.team_id;
            }
        });
    }

    return { teamsFifaMap, teamsNameToId, aliasMap };
}

function isMatchFinished(match) {
    if (!match?.estado) return false;
    const e = String(match.estado).toLowerCase();
    return e === 'finalizado' || e === 'finished' || e === 'ft';
}

function resolveMatchTeamId(match, side, teamsNameToId, aliasMap) {
    const idField = side === 'local' ? 'equipo_local_id' : 'equipo_visitante_id';
    const nameField = side === 'local' ? 'equipo_local_nombre' : 'equipo_visitante_nombre';

    const directId = Number(match[idField]);
    if (Number.isFinite(directId) && directId > 0) return directId;

    const name = match[nameField];
    if (!name || name === 'Por definir') return null;

    const namesToTry = [name];
    if (typeof window.translateTeamName === 'function') {
        const translated = window.translateTeamName(name);
        if (translated && translated !== name) namesToTry.push(translated);
    }

    for (const candidate of namesToTry) {
        const normalized = normalizeName(candidate);
        if (aliasMap[normalized]) return aliasMap[normalized];
        if (teamsNameToId[normalized]) return teamsNameToId[normalized];
    }

    return null;
}

function selectionPlaysInMatch(match, selection, teamsNameToId, aliasMap) {
    const selectionId = getSelectionTeamId(selection);
    if (!selectionId) return false;

    const localId = resolveMatchTeamId(match, 'local', teamsNameToId, aliasMap);
    const awayId = resolveMatchTeamId(match, 'away', teamsNameToId, aliasMap);

    return selectionId === localId || selectionId === awayId;
}

function calcSelectionMatchPoints(match, selection, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap) {
    if (!isMatchFinished(match)) return { points: 0, goals: 0, multiplier: 1, goalFactor: 1, teamName: getSelectionTeamName(selection), played: false };

    const selectionId = getSelectionTeamId(selection);
    if (!selectionId) return { points: 0, goals: 0, multiplier: 1, goalFactor: 1, teamName: getSelectionTeamName(selection), played: false };

    const localId = resolveMatchTeamId(match, 'local', teamsNameToId, aliasMap);
    const awayId = resolveMatchTeamId(match, 'away', teamsNameToId, aliasMap);

    let goals = 0;
    let played = false;

    if (localId === selectionId) {
        goals = match.goles_local ?? 0;
        played = true;
    } else if (awayId === selectionId) {
        goals = match.goles_visitante ?? 0;
        played = true;
    }

    if (!played) return { points: 0, goals: 0, multiplier: getPhaseMultiplier(match.fase), goalFactor: 1, teamName: getSelectionTeamName(selection), played: false };

    const teamFifa = getSelectionFifaPoints(selection, teamsFifaMap);
    const goalFactor = maxFifaPoints / teamFifa;
    const multiplier = getPhaseMultiplier(match.fase);
    const points = round2(goals * multiplier * goalFactor);

    return {
        points,
        goals,
        multiplier,
        goalFactor,
        teamName: getSelectionTeamName(selection),
        played: true
    };
}

function calcUserPichichi(selections, matches, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap) {
    const perMatch = [];
    let total = 0;

    if (!selections || !matches) return { total: 0, perMatch: [] };

    matches.forEach(match => {
        if (!isMatchFinished(match)) return;

        let matchTotal = 0;
        const breakdown = [];

        selections.forEach(selection => {
            const result = calcSelectionMatchPoints(match, selection, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap);
            if (result.played) {
                matchTotal = round2(matchTotal + result.points);
                breakdown.push(result);
            }
        });

        if (breakdown.length > 0) {
            total = round2(total + matchTotal);
            perMatch.push({ matchId: match.id, points: matchTotal, breakdown });
        }
    });

    return { total, perMatch };
}

function calcMatchPichichiForUser(match, selections, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap) {
    if (!isMatchFinished(match) || !selections?.length) {
        return { total: 0, breakdown: [], hasFavorite: false };
    }

    const breakdown = [];
    let total = 0;

    selections.forEach(selection => {
        const result = calcSelectionMatchPoints(match, selection, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap);
        if (result.played) {
            total = round2(total + result.points);
            breakdown.push(result);
        }
    });

    return { total: round2(total), breakdown, hasFavorite: breakdown.length > 0 };
}

async function loadTeamAliases() {
    if (!window.supabaseClient) return [];
    const { data, error } = await window.supabaseClient
        .from('team_aliases')
        .select('api_name, team_id');
    if (error) {
        console.warn('No se pudieron cargar team_aliases:', error.message);
        return [];
    }
    return data || [];
}

window.PichichiScoring = {
    PHASE_MULTIPLIERS,
    round2,
    normalizeName,
    getPhaseMultiplier,
    getSelectionTeamId,
    getSelectionFifaPoints,
    getSelectionTeamName,
    buildTeamMaps,
    isMatchFinished,
    resolveMatchTeamId,
    selectionPlaysInMatch,
    calcSelectionMatchPoints,
    calcUserPichichi,
    calcMatchPichichiForUser,
    loadTeamAliases
};

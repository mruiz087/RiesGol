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
        return String(id);
    }
    if (selection.teams?.id != null) {
        const num = Number(selection.teams.id);
        if (Number.isFinite(num) && num > 0) return num;
        return String(selection.teams.id);
    }
    return null;
}

/** Compara team ids sin fallar por number vs string ("5" === 5). */
function sameTeamId(a, b) {
    if (a == null || b == null || a === '' || b === '') return false;
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na > 0 && nb > 0) {
        return na === nb;
    }
    return String(a) === String(b);
}

function normalizeTeamId(id) {
    if (id == null || id === '') return null;
    const num = Number(id);
    if (Number.isFinite(num) && num > 0) return num;
    return String(id);
}

function getSelectionFifaPoints(selection, teamsFifaMap) {
    const teamId = getSelectionTeamId(selection);
    if (teamId != null && teamsFifaMap) {
        const val = teamsFifaMap[teamId] ?? teamsFifaMap[String(teamId)] ?? teamsFifaMap[Number(teamId)];
        if (val != null && Number.isFinite(Number(val)) && Number(val) > 0) return Number(val);
    }
    return 1000;
}

function getSelectionTeamName(selection) {
    return selection.teams?.nombre || 'Equipo';
}

/**
 * Construye mapas auxiliares desde listas de equipos y aliases.
 * teamsFifaMap: teamId -> valor (desde group_team_values)
 * teamsNameToId: nombre normalizado -> teamId
 * aliasMap: api_name normalizado -> teamId
 */
function buildTeamMaps(teams, groupTeamValues, aliases) {
    const teamsFifaMap = {};
    const teamsNameToId = {};
    const translations = window.TEAM_NAME_TRANSLATIONS || {};

    if (groupTeamValues) {
        groupTeamValues.forEach(gv => {
            const valor = Number(gv.valor);
            const tid = normalizeTeamId(gv.team_id);
            if (Number.isFinite(valor) && valor > 0 && tid != null) {
                teamsFifaMap[tid] = valor;
                teamsFifaMap[String(tid)] = valor;
            }
        });
    }

    if (teams) {
        teams.forEach(t => {
            const tid = normalizeTeamId(t.id);
            if (t.nombre && tid != null) {
                teamsNameToId[normalizeName(t.nombre)] = tid;
                for (const [enName, esName] of Object.entries(translations)) {
                    if (esName === t.nombre) {
                        teamsNameToId[normalizeName(enName)] = tid;
                    }
                }
            }
        });
    }

    const aliasMap = {};
    if (aliases) {
        aliases.forEach(a => {
            if (a.api_name) {
                const tid = normalizeTeamId(a.team_id);
                if (tid != null) aliasMap[normalizeName(a.api_name)] = tid;
            }
        });
    }

    return { teamsFifaMap, teamsNameToId, aliasMap };
}

function isMatchFinished(match) {
    if (!match) return false;
    if (match.estado != null && match.estado !== '') {
        const e = String(match.estado).toLowerCase();
        if (e === 'finalizado' || e === 'finished' || e === 'ft') return true;
    }
    const gl = match.goles_local;
    const gv = match.goles_visitante;
    return gl !== null && gl !== undefined && gv !== null && gv !== undefined;
}

/** Resultado 1/X/2 usando Number() para evitar comparaciones de strings ("10" > "2"). */
function getMatchResult(match) {
    const gl = Number(match?.goles_local);
    const gv = Number(match?.goles_visitante);
    if (!Number.isFinite(gl) || !Number.isFinite(gv)) return null;
    if (gl > gv) return '1';
    if (gv > gl) return '2';
    return 'X';
}

/**
 * Puntos de apuesta de un partido (misma fórmula en Clasificación y Partidos).
 * Fallos = participantes que no acertaron (incluye sin apuesta).
 * Acertante: failed * multiplier. Sin apuesta / fallo: 0.
 *
 * @returns {{ resultado: string|null, failed: number, correctCount: number, pointsByUser: Record<string, number>, pointsForUser: (userId: string) => number }}
 */
function calcBetPointsForMatch({ match, bets, participantIds, multiplier }) {
    const empty = {
        resultado: null,
        failed: 0,
        correctCount: 0,
        pointsByUser: {},
        pointsForUser: () => 0,
    };

    const participants = [...new Set((participantIds || []).map((id) => String(id)).filter(Boolean))];
    if (!match || participants.length === 0) return empty;

    const resultado = getMatchResult(match);
    if (!resultado) return empty;

    const matchKey = (id) => (id == null ? '' : String(id));
    const participantSet = new Set(participants);
    const matchBets = (bets || []).filter((b) => matchKey(b.match_id) === matchKey(match.id));

    const correctUserIds = new Set();
    matchBets.forEach((bet) => {
        const uid = String(bet.user_id);
        if (!participantSet.has(uid)) return;
        if (String(bet.prediccion || '').trim().toUpperCase() === resultado) {
            correctUserIds.add(uid);
        }
    });

    const failed = participants.length - correctUserIds.size;
    const pts = failed > 0 ? failed * (Number(multiplier) || 1) : 0;
    const pointsByUser = {};
    correctUserIds.forEach((uid) => {
        pointsByUser[uid] = pts;
    });

    return {
        resultado,
        failed,
        correctCount: correctUserIds.size,
        pointsByUser,
        pointsForUser: (userId) => pointsByUser[String(userId)] || 0,
    };
}

function isScoringMatch(match) {
    if (!match) return false;
    const fase = (match.fase || 'GROUP_STAGE').toUpperCase().replace(/ /g, '_');
    if (fase === 'THIRD_PLACE' || fase === 'THIRD_PLACE_MATCH') return false;
    return isMatchFinished(match);
}

function resolveMatchTeamId(match, side, teamsNameToId, aliasMap) {
    const idField = side === 'local' ? 'equipo_local_id' : 'equipo_visitante_id';
    const nameField = side === 'local' ? 'equipo_local_nombre' : 'equipo_visitante_nombre';

    const directId = normalizeTeamId(match[idField]);
    if (directId != null) return directId;

    const name = match[nameField];
    if (!name || name === 'Por definir') return null;

    const namesToTry = [name];
    if (typeof window.translateTeamName === 'function') {
        const translated = window.translateTeamName(name);
        if (translated && translated !== name) namesToTry.push(translated);
    }

    for (const candidate of namesToTry) {
        const normalized = normalizeName(candidate);
        if (aliasMap[normalized] != null) return normalizeTeamId(aliasMap[normalized]);
        if (teamsNameToId[normalized] != null) return normalizeTeamId(teamsNameToId[normalized]);
    }

    return null;
}

function selectionPlaysInMatch(match, selection, teamsNameToId, aliasMap) {
    const selectionId = getSelectionTeamId(selection);
    if (selectionId == null) return false;

    const localId = resolveMatchTeamId(match, 'local', teamsNameToId, aliasMap);
    const awayId = resolveMatchTeamId(match, 'away', teamsNameToId, aliasMap);

    return sameTeamId(selectionId, localId) || sameTeamId(selectionId, awayId);
}

function calcSelectionMatchPoints(match, selection, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap) {
    if (!isScoringMatch(match)) {
        return { points: 0, goals: 0, multiplier: 1, goalFactor: 1, teamName: getSelectionTeamName(selection), played: false };
    }

    const selectionId = getSelectionTeamId(selection);
    if (selectionId == null) {
        return { points: 0, goals: 0, multiplier: 1, goalFactor: 1, teamName: getSelectionTeamName(selection), played: false };
    }

    const localId = resolveMatchTeamId(match, 'local', teamsNameToId, aliasMap);
    const awayId = resolveMatchTeamId(match, 'away', teamsNameToId, aliasMap);

    let goals = 0;
    let played = false;

    if (sameTeamId(localId, selectionId)) {
        goals = Number(match.goles_local);
        played = true;
    } else if (sameTeamId(awayId, selectionId)) {
        goals = Number(match.goles_visitante);
        played = true;
    }

    if (!played) {
        return { points: 0, goals: 0, multiplier: getPhaseMultiplier(match.fase), goalFactor: 1, teamName: getSelectionTeamName(selection), played: false };
    }

    if (!Number.isFinite(goals) || goals < 0) goals = 0;

    const teamFifa = getSelectionFifaPoints(selection, teamsFifaMap);
    const safeFifa = teamFifa > 0 ? teamFifa : 1000;
    const maxFifa = Number(maxFifaPoints) > 0 ? Number(maxFifaPoints) : 1000;
    // Factor = FIFA del favorito principal (máx. de la porra) / FIFA del equipo seleccionado
    const goalFactor = maxFifa / safeFifa;
    const multiplier = getPhaseMultiplier(match.fase);
    // Precisión completa; redondeo solo al mostrar
    const points = goals * multiplier * goalFactor;

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
        if (!isScoringMatch(match)) return;

        let matchTotal = 0;
        const breakdown = [];

        selections.forEach(selection => {
            const result = calcSelectionMatchPoints(match, selection, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap);
            if (result.played) {
                matchTotal += result.points;
                breakdown.push(result);
            }
        });

        if (breakdown.length > 0) {
            total += matchTotal;
            perMatch.push({ matchId: match.id, points: matchTotal, breakdown });
        }
    });

    return { total, perMatch };
}

function calcMatchPichichiForUser(match, selections, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap) {
    if (!isScoringMatch(match) || !selections?.length) {
        return { total: 0, breakdown: [], hasFavorite: false };
    }

    const breakdown = [];
    let total = 0;

    selections.forEach(selection => {
        const result = calcSelectionMatchPoints(match, selection, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap);
        if (result.played) {
            total += result.points;
            breakdown.push(result);
        }
    });

    return { total, breakdown, hasFavorite: breakdown.length > 0 };
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
    normalizeTeamId,
    sameTeamId,
    getPhaseMultiplier,
    getSelectionTeamId,
    getSelectionFifaPoints,
    getSelectionTeamName,
    buildTeamMaps,
    isMatchFinished,
    isScoringMatch,
    getMatchResult,
    calcBetPointsForMatch,
    resolveMatchTeamId,
    selectionPlaysInMatch,
    calcSelectionMatchPoints,
    calcUserPichichi,
    calcMatchPichichiForUser,
    loadTeamAliases
};

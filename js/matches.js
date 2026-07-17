// js/matches.js
// Renderizado de partidos y lógica para enviar apuestas

// Configuración de fases: nombre en español y multiplicador
const PHASE_CONFIG = {
    'GROUP_STAGE':    { label: 'Fase de Grupos',          multiplier: 1 },
    'LAST_32':        { label: 'Dieciseisavos',            multiplier: 2 },
    'LAST_16':        { label: 'Octavos',                  multiplier: 3 },
    'ROUND_OF_16':    { label: 'Octavos',                  multiplier: 3 },
    'QUARTER_FINALS': { label: 'Cuartos',                  multiplier: 4 },
    'SEMI_FINALS':    { label: 'Semifinal',                multiplier: 5 },
    'FINAL':          { label: 'Final',                    multiplier: 6 },
};

const TEAM_NAME_TRANSLATIONS = {
    'GERMANY': 'Alemania', 'SCOTLAND': 'Escocia', 'SPAIN': 'España', 'ITALY': 'Italia',
    'ENGLAND': 'Inglaterra', 'DENMARK': 'Dinamarca', 'FRANCE': 'Francia', 'NETHERLANDS': 'Países Bajos',
    'BELGIUM': 'Bélgica', 'PORTUGAL': 'Portugal', 'POLAND': 'Polonia', 'SWITZERLAND': 'Suiza',
    'AUSTRIA': 'Austria', 'CZECH REPUBLIC': 'República Checa', 'SWEDEN': 'Suecia', 'NORWAY': 'Noruega',
    'GREECE': 'Grecia', 'TURKEY': 'Turquía', 'RUSSIA': 'Rusia', 'UKRAINE': 'Ucrania',
    'HUNGARY': 'Hungría', 'ROMANIA': 'Rumania', 'SERBIA': 'Serbia', 'CROATIA': 'Croacia',
    'BOSNIA AND HERZEGOVINA': 'Bosnia y Herzegovina', 'ICELAND': 'Islandia', 'SLOVENIA': 'Eslovenia',
    'SLOVAKIA': 'Eslovaquia', 'BULGARIA': 'Bulgaria', 'WALES': 'Gales', 'IRELAND': 'Irlanda',
    'NORTHERN IRELAND': 'Irlanda del Norte', 'CYPRUS': 'Chipre', 'MALTA': 'Malta', 'LUXEMBOURG': 'Luxemburgo',
    'BELARUS': 'Bielorrusia', 'LITHUANIA': 'Lituania', 'LATVIA': 'Letonia', 'ESTONIA': 'Estonia',
    'ALBANIA': 'Albania', 'NORTH MACEDONIA': 'Macedonia del Norte', 'MONTENEGRO': 'Montenegro',
    'KOSOVO': 'Kosovo', 'MOLDOVA': 'Moldavia', 'GEORGIA': 'Georgia', 'ARMENIA': 'Armenia',
    'AZERBAIJAN': 'Azerbaiyán', 'BRAZIL': 'Brasil', 'ARGENTINA': 'Argentina', 'COLOMBIA': 'Colombia',
    'VENEZUELA': 'Venezuela', 'URUGUAY': 'Uruguay', 'PARAGUAY': 'Paraguay', 'CHILE': 'Chile',
    'PERU': 'Perú', 'ECUADOR': 'Ecuador', 'BOLIVIA': 'Bolivia', 'SURINAME': 'Surinam',
    'GUYANA': 'Guyana', 'MEXICO': 'México', 'UNITED STATES': 'Estados Unidos', 'CANADA': 'Canadá',
    'COSTA RICA': 'Costa Rica', 'PANAMA': 'Panamá', 'HONDURAS': 'Honduras', 'EL SALVADOR': 'El Salvador',
    'GUATEMALA': 'Guatemala', 'NICARAGUA': 'Nicaragua', 'BELIZE': 'Belice', 'JAMAICA': 'Jamaica',
    'HAITI': 'Haití', 'TRINIDAD AND TOBAGO': 'Trinidad y Tobago', 'CURACAO': 'Curazao',
    'JAPAN': 'Japón', 'SOUTH KOREA': 'Corea del Sur', 'CHINA': 'China', 'INDIA': 'India',
    'SAUDI ARABIA': 'Arabia Saudita', 'UNITED ARAB EMIRATES': 'Emiratos Árabes Unidos', 'IRAN': 'Irán',
    'IRAQ': 'Irak', 'SYRIA': 'Siria', 'LEBANON': 'Líbano', 'ISRAEL': 'Israel',
    'PALESTINE': 'Palestina', 'JORDAN': 'Jordania', 'OMAN': 'Omán', 'QATAR': 'Catar',
    'KUWAIT': 'Kuwait', 'BAHRAIN': 'Baréin', 'YEMEN': 'Yemen', 'THAILAND': 'Tailandia',
    'VIETNAM': 'Vietnam', 'INDONESIA': 'Indonesia', 'MALAYSIA': 'Malasia', 'SINGAPORE': 'Singapur',
    'PHILIPPINES': 'Filipinas', 'BANGLADESH': 'Bangladesh', 'PAKISTAN': 'Pakistán', 'AFGHANISTAN': 'Afganistán',
    'NORTH KOREA': 'Corea del Norte', 'UZBEKISTAN': 'Uzbekistán', 'TAJIKISTAN': 'Tayikistán',
    'KYRGYZSTAN': 'Kirguistán', 'TURKMENISTAN': 'Turkmenistán', 'KAZAKHSTAN': 'Kazajistán',
    'HONG KONG': 'Hong Kong', 'MONGOLIA': 'Mongolia', 'MYANMAR': 'Myanmar', 'CAMBODIA': 'Camboya',
    'LAOS': 'Laos', 'NEPAL': 'Nepal', 'SRI LANKA': 'Sri Lanka', 'MALDIVES': 'Maldivas',
    'BHUTAN': 'Bután', 'MACAU': 'Macao', 'TAIWAN': 'Taiwán', 'EGYPT': 'Egipto',
    'NIGERIA': 'Nigeria', 'GHANA': 'Ghana', 'CAMEROON': 'Camerún', 'IVORY COAST': 'Costa de Marfil',
    'SENEGAL': 'Senegal', 'MOROCCO': 'Marruecos', 'TUNISIA': 'Túnez', 'ALGERIA': 'Argelia',
    'SOUTH AFRICA': 'Sudáfrica', 'ETHIOPIA': 'Etiopía', 'KENYA': 'Kenia', 'UGANDA': 'Uganda',
    'TANZANIA': 'Tanzania', 'ZAMBIA': 'Zambia', 'ZIMBABWE': 'Zimbabue', 'MALI': 'Mali',
    'BURKINA FASO': 'Burkina Faso', 'NIGER': 'Níger', 'BENIN': 'Benín', 'TOGO': 'Togo',
    'LIBERIA': 'Liberia', 'GUINEA': 'Guinea', 'GUINEA-BISSAU': 'Guinea-Bisáu', 'MOZAMBIQUE': 'Mozambique',
    'ANGOLA': 'Angola', 'BOTSWANA': 'Botsuana', 'NAMIBIA': 'Namibia', 'MALAWI': 'Malaui',
    'LESOTHO': 'Lesoto', 'MAURITIUS': 'Mauricio', 'SEYCHELLES': 'Seychelles', 'GABON': 'Gabón',
    'CONGO': 'Congo', 'DR CONGO': 'República Democrática del Congo', 'CENTRAL AFRICAN REPUBLIC': 'República Centroafricana',
    'CHAD': 'Chad', 'SUDAN': 'Sudán', 'SOUTH SUDAN': 'Sudán del Sur', 'LIBYA': 'Libia',
    'MAURITANIA': 'Mauritania', 'DJIBOUTI': 'Yibuti', 'SOMALIA': 'Somalia', 'RWANDA': 'Ruanda',
    'BURUNDI': 'Burundi', 'SIERRA LEONE': 'Sierra Leona', 'COMOROS': 'Comoras', 'MADAGASCAR': 'Madagascar',
    'CAPE VERDE': 'Cabo Verde', 'SAO TOME AND PRINCIPE': 'Santo Tomé y Príncipe', 'EQUATORIAL GUINEA': 'Guinea Ecuatorial',
    'AUSTRALIA': 'Australia', 'NEW ZEALAND': 'Nueva Zelanda', 'FIJI': 'Fiyi', 'SOLOMON ISLANDS': 'Islas Salomón',
    'PAPUA NEW GUINEA': 'Papúa Nueva Guinea', 'SAMOA': 'Samoa', 'VANUATU': 'Vanuatu', 'KIRIBATI': 'Kiribati',
    'NAURU': 'Nauru', 'PALAU': 'Palaos', 'TONGA': 'Tonga', 'TUVALU': 'Tuvalu', 'MARSHALL ISLANDS': 'Islas Marshall',
    'MICRONESIA': 'Micronesia'
};

window.TEAM_NAME_TRANSLATIONS = TEAM_NAME_TRANSLATIONS;

function translateTeamName(name) {
    if (!name) return name;
    const key = name.trim().toUpperCase();
    return TEAM_NAME_TRANSLATIONS[key] || name;
}

function getPhaseConfig(fase) {
    // Intentar match exacto primero, luego parcial
    if (PHASE_CONFIG[fase]) return PHASE_CONFIG[fase];
    const faseUpper = (fase || '').toUpperCase().replace(/ /g, '_');
    if (PHASE_CONFIG[faseUpper]) return PHASE_CONFIG[faseUpper];
    // Búsqueda parcial
    for (const [key, val] of Object.entries(PHASE_CONFIG)) {
        if (faseUpper.includes(key) || key.includes(faseUpper)) return val;
    }
    return { label: fase || 'Desconocida', multiplier: 1 };
}

window.loadMatches = async function() {
    window.showLoading();
    try {
        const matchesContainer = document.getElementById('matches-container');
        matchesContainer.innerHTML = '';

        // Obtener tournamentId del grupo seleccionado
        const tournamentId = window.Groups?.currentTournamentId || null;
        const groupId = window.Groups?.currentGroupId || null;

        if (!groupId) {
            matchesContainer.innerHTML = '<p class="text-muted text-center">Selecciona una porra primero.</p>';
            return;
        }

        const matches = await window.apiClient.getMatches(tournamentId, groupId);

        if (matches.length === 0) {
            matchesContainer.innerHTML = '<p class="text-muted text-center">No hay partidos disponibles aún.</p>';
            return;
        }

        // Obtener apuestas del usuario actual y de todo el grupo
        const user = window.getCurrentUser();
        let userBets = [];
        let allGroupBets = [];
        let userPichichiSelections = [];
        let maxFifaPoints = 1000;
        let teamsFifaMap = {};
        let teamsNameToId = {};
        let aliasMap = {};

        const teamsCatalog = await window.apiClient.getTeams(tournamentId);
        const groupValues = await window.apiClient.getGroupTeamValues(groupId);

        if (teamsCatalog && teamsCatalog.length > 0 && groupValues?.length) {
            const fifaValues = groupValues.map(gv => Number(gv.valor)).filter(v => Number.isFinite(v) && v > 0);
            maxFifaPoints = fifaValues.length > 0 ? Math.max(...fifaValues) : 1000;
        }

        if (user && window.supabaseClient && window.PichichiScoring) {
            const aliases = await window.PichichiScoring.loadTeamAliases();
            const maps = window.PichichiScoring.buildTeamMaps(teamsCatalog || [], groupValues || [], aliases);
            teamsFifaMap = maps.teamsFifaMap;
            teamsNameToId = maps.teamsNameToId;
            aliasMap = maps.aliasMap;

            const { data, error: betsError } = await window.supabaseClient
                .from('bets')
                .select('*')
                .eq('user_id', user.id)
                .eq('group_id', groupId);
            if (betsError) console.error('Error cargando apuestas:', betsError);
            if (data) userBets = data;

            const { data: groupBets } = await window.supabaseClient
                .from('bets')
                .select('user_id, match_id, prediccion')
                .eq('group_id', groupId);
            if (groupBets) allGroupBets = groupBets;

            const { data: selections, error: selError } = await window.supabaseClient
                .from('favorite_selections')
                .select('*, teams(id, nombre)')
                .eq('user_id', user.id)
                .eq('group_id', groupId);
            if (selError) console.error('Error cargando selecciones Pichichi:', selError);
            if (selections) userPichichiSelections = selections;
        }

        // Agrupar partidos por fase, manteniendo el orden de aparición (excluyendo THIRD_PLACE)
        const phaseOrder = [];
        const phaseGroups = {};
        matches.forEach(match => {
            const fase = match.fase || 'GROUP_STAGE';
            // Excluir partidos de 3er y 4º puesto
            if (fase === 'THIRD_PLACE' || fase === 'THIRD_PLACE_MATCH') return;
            
            if (!phaseGroups[fase]) {
                phaseGroups[fase] = [];
                phaseOrder.push(fase);
            }
            phaseGroups[fase].push(match);
        });

        // Determinar la fase más próxima con partidos pendientes para abrirla por defecto
        let defaultOpenPhase = phaseOrder[0];
        for (const fase of phaseOrder) {
            const hasPending = phaseGroups[fase].some(m => m.estado === 'pendiente');
            if (hasPending) { defaultOpenPhase = fase; break; }
        }

        // Renderizar cada fase como sección desplegable
        phaseOrder.forEach(fase => {
            const config = getPhaseConfig(fase);
            const isOpen = fase === defaultOpenPhase;

            const section = document.createElement('details');
            section.className = 'phase-section';
            if (isOpen) section.setAttribute('open', '');

            section.innerHTML = `
                <summary class="phase-summary">
                    <span class="phase-label">${config.label}</span>
                    <span class="phase-multiplier">✕${config.multiplier} puntos</span>
                    <span class="phase-count">${phaseGroups[fase].length} partidos</span>
                    <span class="phase-chevron">›</span>
                </summary>
                <div class="matches-grid phase-matches"></div>
            `;

            const grid = section.querySelector('.phase-matches');
            phaseGroups[fase].forEach(match => {
                const bet = userBets.find(b => b.match_id === match.id);
                const card = createMatchCard(match, bet, config.multiplier, userPichichiSelections, allGroupBets, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap);
                grid.appendChild(card);
            });

            matchesContainer.appendChild(section);
        });

    } catch (error) {
        console.error(error);
    } finally {
        window.hideLoading();
    }
};

function createMatchCard(match, userBet, multiplier, userPichichiSelections = [], allGroupBets = [], maxFifaPoints = 1000, teamsFifaMap = {}, teamsNameToId = {}, aliasMap = {}) {
    const PS = window.PichichiScoring;
    if (!PS) {
        console.error('PichichiScoring no cargado');
        return document.createElement('div');
    }

    const round2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
    const formatPoints = (n) => round2(n).toFixed(2);

    const isPast = new Date(match.fecha_inicio) < new Date();
    const isUndefined = match.equipo_local_nombre === 'Por definir' || match.equipo_visitante_nombre === 'Por definir';
    const disableBets = isPast || isUndefined;

    const playingSelections = userPichichiSelections.filter(s =>
        PS.selectionPlaysInMatch(match, s, teamsNameToId, aliasMap)
    );
    const hasFavorite = playingSelections.length > 0;

    // Calcular puntos y construir resumen (total visible + desglose en desplegable)
    let betResult = null;
    let betPointsEarned = 0;
    let pichichiPointsEarned = 0;
    let pichichiBreakdownLines = [];
    let matchPointsHtml = '';

    if (PS.isMatchFinished(match)) {
        let resultado = 'X';
        if (match.goles_local > match.goles_visitante) resultado = '1';
        else if (match.goles_visitante > match.goles_local) resultado = '2';

        if (userBet) {
            betResult = userBet.prediccion === resultado;
            const matchBets = allGroupBets.filter(b => b.match_id === match.id);
            const failedBets = matchBets.length - matchBets.filter(b => b.prediccion === resultado).length;
            if (betResult) {
                betPointsEarned = failedBets * multiplier;
            }
        }

        const pichichiResult = PS.calcMatchPichichiForUser(match, userPichichiSelections, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap);
        pichichiPointsEarned = pichichiResult.total;
        pichichiBreakdownLines = pichichiResult.breakdown.map(b =>
            `${b.teamName}: ${b.goals} gol${b.goals !== 1 ? 'es' : ''} × fase x${b.multiplier} × valor ${b.goalFactor.toFixed(2)}`
        );

        const totalPoints = round2(betPointsEarned + pichichiPointsEarned);

        let breakdownHtml = '';
        if (userBet) {
            breakdownHtml += `<div class="match-points-line">${betResult
                ? `Apuesta: <strong>+${formatPoints(betPointsEarned)} pts</strong> (acierto)`
                : `Apuesta: <strong>${formatPoints(0)} pts</strong> (fallo)`}</div>`;
        } else {
            breakdownHtml += `<div class="match-points-line">Apuesta: <strong>${formatPoints(0)} pts</strong> (sin apuesta)</div>`;
        }

        if (pichichiResult.hasFavorite) {
            const pichDetail = pichichiBreakdownLines.length > 0
                ? ` — ${pichichiBreakdownLines.join('; ')}`
                : '';
            breakdownHtml += `<div class="match-points-line">Pichichi: <strong>+${formatPoints(pichichiPointsEarned)} pts</strong>${pichDetail}</div>`;
        }

        matchPointsHtml = `
            <details class="match-points-details">
                <summary class="match-points-summary">
                    <span class="match-points-total">+${formatPoints(totalPoints)} pts en este partido</span>
                    <span class="match-points-chevron">›</span>
                </summary>
                <div class="match-points-breakdown">${breakdownHtml}</div>
            </details>`;
    }

    let selectedPrediction = userBet ? userBet.prediccion : null;

    // Estilos para acierto/fallo
    const cardBorderStyle = betResult !== null 
        ? (betResult ? 'border: 2px solid #00ff88;' : 'border: 2px solid #ff4444;') 
        : '';

    const card = document.createElement('div');
    card.className = 'match-card glass-panel';
    if (cardBorderStyle) {
        card.style = cardBorderStyle;
    }
    
    const btn1Class = selectedPrediction === '1' ? 'bet-btn selected' : 'bet-btn';
    const btnXClass = selectedPrediction === 'X' ? 'bet-btn selected' : 'bet-btn';
    const btn2Class = selectedPrediction === '2' ? 'bet-btn selected' : 'bet-btn';
    const disabledAttr = disableBets ? 'disabled' : '';

    // Resultado en una línea
    let scoreHtml = '';
    let extraInfoHtml = '';
    if (match.estado === 'finalizado' || match.estado === 'en_juego') {
        const gl = match.goles_local ?? '?';
        const gv = match.goles_visitante ?? '?';
        scoreHtml = `<div class="match-score-inline">${gl} - ${gv}</div>`;

        // Info de prórroga / penaltis
        if (match.duracion && match.duracion.toUpperCase() !== 'REGULAR') {
            const durationKey = match.duracion.toUpperCase();
            const labelMap = {
                'PENALTY_SHOOTOUT': 'Penaltis',
                'PENALTIES': 'Penaltis',
                'PENALTIS': 'Penaltis',
                'EXTRA_TIME': 'Prórroga',
                'PRORROGA': 'Prórroga',
                'OVERTIME': 'Prórroga',
                'ET': 'Prórroga'
            };
            const durLabel = labelMap[durationKey] || 'Prórroga';
            let extraDetail = '';
            if ((durationKey === 'PENALTY_SHOOTOUT' || durationKey === 'PENALTIES' || durationKey === 'PENALTIS') && match.penaltis_local !== null) {
                extraDetail = ` · Pen: ${match.penaltis_local}-${match.penaltis_visitante}`;
            } else if (durLabel === 'Prórroga') {
                // Mostrar ganador de prórroga si existe
                if (match.resultado_prorroga_ganador) {
                    const ganador = match.resultado_prorroga_ganador === 'local' 
                        ? translateTeamName(match.equipo_local_nombre) 
                        : translateTeamName(match.equipo_visitante_nombre);
                    extraDetail = ` · Ganador: ${ganador}`;
                } else {
                    extraDetail = ` · Resultado final: ${gl}-${gv}`;
                }
            }
            extraInfoHtml = `
                <div class="match-extra-info">
                    ⏱️ ${durLabel}${extraDetail}
                    <span class="match-porra-note">(Para la porra: resultado a 90')</span>
                </div>`;
        }
    } else {
        scoreHtml = `<div class="match-vs">VS</div>`;
    }

    const dateStr = new Date(match.fecha_inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const localTeamName = translateTeamName(match.equipo_local_nombre);
    const awayTeamName = translateTeamName(match.equipo_visitante_nombre);

    // Indicador de favorito Pichichi (solo partidos no finalizados)
    let favoriteIndicator = '';
    if (hasFavorite && !PS.isMatchFinished(match)) {
        const favoriteInfo = playingSelections.map(s =>
            `⚽ ${PS.getSelectionTeamName(s)}`
        ).join(' · ');

        favoriteIndicator = `<div class="pichichi-indicator">${favoriteInfo} · favorito Pichichi</div>`;
    }

    card.innerHTML = `
        <div class="match-date">${dateStr}</div>
        <div class="match-row">
            <div class="match-team match-team-home">
                <span class="team-name">${localTeamName}</span>
                ${typeof window.teamFlagHtml === 'function' ? window.teamFlagHtml(match.equipo_local_nombre) : ''}
            </div>
            ${scoreHtml}
            <div class="match-team match-team-away">
                ${typeof window.teamFlagHtml === 'function' ? window.teamFlagHtml(match.equipo_visitante_nombre) : ''}
                <span class="team-name">${awayTeamName}</span>
            </div>
        </div>
        ${extraInfoHtml}
        ${favoriteIndicator}
        ${matchPointsHtml}
        <div class="bet-options">
            <button class="${btn1Class}" data-match="${match.id}" data-pred="1" ${disabledAttr}>1</button>
            <button class="${btnXClass}" data-match="${match.id}" data-pred="X" ${disabledAttr}>X</button>
            <button class="${btn2Class}" data-match="${match.id}" data-pred="2" ${disabledAttr}>2</button>
        </div>
        ${disableBets ? `<p class="bet-status-note">${isPast ? (selectedPrediction ? `Apuesta guardada: ${selectedPrediction}` : 'Partido cerrado sin apuesta') : 'Equipos no definidos'}</p>` : ''}
    `;

    // Event Listeners para apuestas
    if (!isPast && !isUndefined) {
        const btns = card.querySelectorAll('.bet-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const matchId = parseInt(e.target.getAttribute('data-match'), 10);
                const pred = e.target.getAttribute('data-pred');

                // Feedback visual instantáneo
                btns.forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');

                await submitBet(matchId, pred);
            });
        });
    }

    return card;
}

async function submitBet(matchId, prediccion) {
    const user = window.getCurrentUser();
    const groupId = window.Groups?.currentGroupId;
    
    if (!user || !window.supabaseClient) {
        window.toast?.error("Debes iniciar sesión para apostar.");
        return;
    }

    if (!groupId) {
        window.toast?.warning("Debes seleccionar una porra primero.");
        return;
    }

    try {
        // Verificar que el usuario existe en porra.users (sino crearlo)
        const { data: userProfile, error: profileError } = await window.supabaseClient
            .from('users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!userProfile) {
            // El usuario no existe en porra.users, crearlo con valores por defecto
            const { error: insertProfileError } = await window.supabaseClient
                .from('users')
                .insert([
                    { id: user.id, name: user.email?.split('@')[0] || 'Usuario'}
                ]);
            if (insertProfileError) throw insertProfileError;
        }

        // Estrategia SELECT → INSERT o UPDATE (más fiable que upsert con constraint compuesto)
        const { data: existing, error: selectError } = await window.supabaseClient
            .from('bets')
            .select('id')
            .eq('user_id', user.id)
            .eq('match_id', matchId)
            .eq('group_id', groupId)
            .maybeSingle();

        if (selectError) throw selectError;

        let error;
        if (existing) {
            // Ya existe → actualizar predicción
            ({ error } = await window.supabaseClient
                .from('bets')
                .update({ prediccion, fecha_apuesta: new Date().toISOString() })
                .eq('id', existing.id));
        } else {
            // No existe → insertar nueva apuesta con group_id
            ({ error } = await window.supabaseClient
                .from('bets')
                .insert({ 
                    match_id: matchId, 
                    user_id: user.id, 
                    group_id: groupId,
                    prediccion, 
                    fecha_apuesta: new Date().toISOString() 
                }));
        }

        if (error) throw error;

    } catch (err) {
        console.error("Error guardando apuesta", err);
        window.toast?.error("Error al guardar: " + (err.message || "Revisa tu conexión."));
    }
}

window.translateTeamName = translateTeamName;

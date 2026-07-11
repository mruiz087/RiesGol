// js/stats.js
// Estadísticas de apuestas por partido finalizado en la porra
(function() {
    const STATS_PHASE_CONFIG = {
        'GROUP_STAGE':    { label: 'Fase de Grupos',  multiplier: 1 },
        'LAST_32':        { label: 'Dieciseisavos',   multiplier: 2 },
        'LAST_16':        { label: 'Octavos',         multiplier: 3 },
        'ROUND_OF_16':    { label: 'Octavos',         multiplier: 3 },
        'QUARTER_FINALS': { label: 'Cuartos',         multiplier: 4 },
        'SEMI_FINALS':    { label: 'Semifinal',       multiplier: 5 },
        'FINAL':          { label: 'Final',           multiplier: 6 },
    };

    function translateTeamName(name) {
        if (typeof window.translateTeamName === 'function') {
            return window.translateTeamName(name);
        }
        return name;
    }

    function getPhaseConfig(fase) {
        if (STATS_PHASE_CONFIG[fase]) return STATS_PHASE_CONFIG[fase];
        const faseUpper = (fase || '').toUpperCase().replace(/ /g, '_');
        if (STATS_PHASE_CONFIG[faseUpper]) return STATS_PHASE_CONFIG[faseUpper];
        for (const [key, val] of Object.entries(STATS_PHASE_CONFIG)) {
            if (faseUpper.includes(key) || key.includes(faseUpper)) return val;
        }
        return { label: fase || 'Desconocida', multiplier: 1 };
    }

    function isMatchFinished(match) {
        if (window.PichichiScoring?.isMatchFinished?.(match)) return true;
        const gl = match?.goles_local;
        const gv = match?.goles_visitante;
        return gl !== null && gl !== undefined && gv !== null && gv !== undefined;
    }

    function isValidPhase(fase) {
        return fase !== 'THIRD_PLACE' && fase !== 'THIRD_PLACE_MATCH';
    }

    async function loadGroupBets(groupId) {
        const { data: bets, error: betsError } = await window.supabaseClient
            .from('bets')
            .select('match_id, prediccion')
            .eq('group_id', groupId);

        if (betsError) throw betsError;
        return bets || [];
    }

    function renderMatchStatsCard(match, bets) {
        const matchBets = bets.filter(b => Number(b.match_id) === Number(match.id));

        let count1 = 0, countX = 0, count2 = 0;
        matchBets.forEach(bet => {
            if (bet.prediccion === '1') count1++;
            else if (bet.prediccion === 'X') countX++;
            else if (bet.prediccion === '2') count2++;
        });

        const total = matchBets.length;
        const localTeamName = translateTeamName(match.equipo_local_nombre);
        const awayTeamName = translateTeamName(match.equipo_visitante_nombre);
        const gl = match.goles_local ?? '-';
        const gv = match.goles_visitante ?? '-';

        const statsContent = total === 0
            ? '<p class="stats-no-bets">Ningún usuario ha apostado en este partido.</p>'
            : `
                <div class="stat-column">
                    <div class="stat-count">${count1}</div>
                    <div class="stat-label">1</div>
                </div>
                <div class="stat-column">
                    <div class="stat-count">${countX}</div>
                    <div class="stat-label">X</div>
                </div>
                <div class="stat-column">
                    <div class="stat-count">${count2}</div>
                    <div class="stat-label">2</div>
                </div>
            `;

        const card = document.createElement('div');
        card.className = 'glass-panel stats-card';
        card.innerHTML = `
            <h3 class="stats-match-title">
                ${localTeamName}
                <span class="vs">vs</span>
                ${awayTeamName}
            </h3>
            <div class="stats-match-result">Resultado: ${gl} - ${gv}</div>
            <div class="stats-bet-breakdown">${statsContent}</div>
            ${total > 0 ? `<p class="stats-total-bets">${total} apuesta${total !== 1 ? 's' : ''} en la porra</p>` : ''}
        `;
        return card;
    }

    window.loadStats = async function() {
        const container = document.getElementById('stats-container');
        if (!container) return;

        window.showLoading();
        try {
            const groupId = window.Groups?.currentGroupId;
            const tournamentId = window.Groups?.currentTournamentId;

            if (!window.supabaseClient) {
                container.innerHTML = '<p class="stats-empty-message">No se pudo conectar con la base de datos.</p>';
                return;
            }

            if (!groupId || !tournamentId) {
                container.innerHTML = '<p class="stats-empty-message">Selecciona una porra primero.</p>';
                return;
            }

            container.innerHTML = '';

            const matches = await window.apiClient.getMatches(tournamentId, groupId);
            const finishedMatches = (matches || []).filter(m => {
                const fase = m.fase || 'GROUP_STAGE';
                return isValidPhase(fase) && isMatchFinished(m);
            });

            if (finishedMatches.length === 0) {
                container.innerHTML = '<p class="stats-empty-message">No hay partidos finalizados todavía.</p>';
                return;
            }

            const bets = await loadGroupBets(groupId);

            const phaseOrder = [];
            const phaseGroups = {};
            finishedMatches.forEach(match => {
                const fase = match.fase || 'GROUP_STAGE';
                if (!phaseGroups[fase]) {
                    phaseGroups[fase] = [];
                    phaseOrder.push(fase);
                }
                phaseGroups[fase].push(match);
            });

            const defaultOpenPhase = phaseOrder[phaseOrder.length - 1];

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
                    grid.appendChild(renderMatchStatsCard(match, bets));
                });

                container.appendChild(section);
            });

        } catch (error) {
            console.error('Error cargando estadísticas', error);
            container.innerHTML = `<p class="stats-empty-message stats-error">Error al cargar estadísticas: ${error.message}</p>`;
        } finally {
            window.hideLoading();
        }
    };
})();

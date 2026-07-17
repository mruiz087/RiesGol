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

    function flagHtml(name) {
        if (typeof window.teamFlagHtml === 'function') {
            return window.teamFlagHtml(name);
        }
        return '';
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

    function betUserName(bet) {
        return bet?.users?.name || 'Anónimo';
    }

    async function loadGroupBets(groupId) {
        const { data: bets, error: betsError } = await window.supabaseClient
            .from('bets')
            .select('match_id, prediccion, user_id, users(name)')
            .eq('group_id', groupId);

        if (betsError) throw betsError;
        return bets || [];
    }

    function renderVotersList(names) {
        if (!names.length) {
            return '<p class="stats-voters-empty">Nadie</p>';
        }
        return `<ul class="stats-voters-list">${names.map(n => `<li>${n}</li>`).join('')}</ul>`;
    }

    function renderVotesDropdown(names1, namesX, names2, total) {
        if (total === 0) return '';

        return `
            <details class="stats-voters-details stats-voters-unified">
                <summary class="stats-voters-summary">Ver votos (${total})</summary>
                <div class="stats-voters-panel">
                    <div class="stats-voters-group">
                        <h4 class="stats-voters-heading">1 <span>(${names1.length})</span></h4>
                        ${renderVotersList(names1)}
                    </div>
                    <div class="stats-voters-group">
                        <h4 class="stats-voters-heading">X <span>(${namesX.length})</span></h4>
                        ${renderVotersList(namesX)}
                    </div>
                    <div class="stats-voters-group">
                        <h4 class="stats-voters-heading">2 <span>(${names2.length})</span></h4>
                        ${renderVotersList(names2)}
                    </div>
                </div>
            </details>
        `;
    }

    function renderVoteBlock(code, count, total) {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
            <div class="stats-vote-block">
                <div class="stats-vote-code">${code}</div>
                <div class="stats-vote-count">${count}</div>
                <div class="stats-vote-pct">${pct}%</div>
            </div>
        `;
    }

    function renderMatchStatsCard(match, bets) {
        const matchBets = bets.filter(b => Number(b.match_id) === Number(match.id));

        const names1 = [];
        const namesX = [];
        const names2 = [];

        matchBets.forEach(bet => {
            const name = betUserName(bet);
            if (bet.prediccion === '1') names1.push(name);
            else if (bet.prediccion === 'X') namesX.push(name);
            else if (bet.prediccion === '2') names2.push(name);
        });

        const count1 = names1.length;
        const countX = namesX.length;
        const count2 = names2.length;
        const total = matchBets.length;

        const localTeamName = translateTeamName(match.equipo_local_nombre);
        const awayTeamName = translateTeamName(match.equipo_visitante_nombre);
        const gl = match.goles_local ?? '-';
        const gv = match.goles_visitante ?? '-';

        const statsContent = total === 0
            ? '<p class="stats-no-bets">Ningún usuario ha apostado en este partido.</p>'
            : `
                <div class="stats-bet-breakdown">
                    ${renderVoteBlock('1', count1, total)}
                    ${renderVoteBlock('X', countX, total)}
                    ${renderVoteBlock('2', count2, total)}
                </div>
                ${renderVotesDropdown(names1, namesX, names2, total)}
            `;

        const card = document.createElement('div');
        card.className = 'glass-panel stats-card stats-card-row';
        card.innerHTML = `
            <div class="stats-match-line">
                <span class="stats-team stats-team-home">
                    <span class="stats-team-name">${localTeamName}</span>
                    ${flagHtml(match.equipo_local_nombre)}
                </span>
                <span class="stats-match-score">${gl} – ${gv}</span>
                <span class="stats-team stats-team-away">
                    ${flagHtml(match.equipo_visitante_nombre)}
                    <span class="stats-team-name">${awayTeamName}</span>
                </span>
            </div>
            ${statsContent}
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
                    <div class="stats-phase-list phase-matches"></div>
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

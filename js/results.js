// js/results.js
// Resultados + estadísticas de apuestas (fusionado)

(function () {
    const RESULTS_PHASE_CONFIG = {
        GROUP_STAGE: { label: 'Fase de Grupos', multiplier: 1 },
        LAST_32: { label: 'Dieciseisavos', multiplier: 2 },
        LAST_16: { label: 'Octavos', multiplier: 3 },
        ROUND_OF_16: { label: 'Octavos', multiplier: 3 },
        QUARTER_FINALS: { label: 'Cuartos', multiplier: 4 },
        SEMI_FINALS: { label: 'Semifinal', multiplier: 5 },
        FINAL: { label: 'Final', multiplier: 6 },
    };

    let selectedUserId = null;
    let expandAll = false;
    let openMatchIds = new Set();
    let cachedBets = [];
    let cachedMembers = [];
    let cachedPhaseOrder = [];
    let cachedPhaseGroups = {};
    let interactionsBound = false;

    function matchKey(id) {
        return id == null ? '' : String(id);
    }

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
        if (RESULTS_PHASE_CONFIG[fase]) return RESULTS_PHASE_CONFIG[fase];
        const faseUpper = (fase || '').toUpperCase().replace(/ /g, '_');
        if (RESULTS_PHASE_CONFIG[faseUpper]) return RESULTS_PHASE_CONFIG[faseUpper];
        for (const [key, val] of Object.entries(RESULTS_PHASE_CONFIG)) {
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

    function formatDate(iso) {
        try {
            return new Date(iso).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short',
            });
        } catch (_) {
            return '—';
        }
    }

    function teamCell(apiName, side) {
        const display = translateTeamName(apiName);
        const flag = flagHtml(apiName);
        if (side === 'home') {
            return `
                <span class="results-team results-team-home">
                    <span>${display}</span>
                    ${flag}
                </span>
            `;
        }
        return `
            <span class="results-team results-team-away">
                ${flag}
                <span>${display}</span>
            </span>
        `;
    }

    function betUserName(bet) {
        return bet?.users?.name || bet?._userName || 'Anónimo';
    }

    function renderVotersList(names) {
        if (!names.length) {
            return '<p class="stats-voters-empty">Nadie</p>';
        }
        return `<ul class="stats-voters-list">${names.map(n => `<li>${n}</li>`).join('')}</ul>`;
    }

    function renderVoteColumn(code, count, names) {
        return `
            <div class="results-vote-col">
                <div class="results-vote-col-head">
                    <span class="results-vote-code">${code}</span>
                    <span class="results-vote-count">(${count})</span>
                </div>
                ${renderVotersList(names)}
            </div>
        `;
    }

    function getMatchBetStats(matchId) {
        const key = matchKey(matchId);
        const matchBets = cachedBets.filter(b => matchKey(b.match_id) === key);
        const names1 = [];
        const namesX = [];
        const names2 = [];
        matchBets.forEach(bet => {
            const name = betUserName(bet);
            const pred = String(bet.prediccion || '').trim().toUpperCase();
            if (pred === '1') names1.push(name);
            else if (pred === 'X') namesX.push(name);
            else if (pred === '2') names2.push(name);
        });
        return {
            names1,
            namesX,
            names2,
            count1: names1.length,
            countX: namesX.length,
            count2: names2.length,
            total: matchBets.length,
        };
    }

    function getUserPrediction(matchId, userId) {
        const bet = cachedBets.find(
            b => matchKey(b.match_id) === matchKey(matchId) && String(b.user_id) === String(userId)
        );
        const pred = bet?.prediccion != null ? String(bet.prediccion).trim().toUpperCase() : null;
        return pred || null;
    }

    function renderGroupStatsPanel(matchId) {
        const { names1, namesX, names2, count1, countX, count2, total } = getMatchBetStats(matchId);
        if (total === 0) {
            return '<p class="stats-no-bets">Ningún usuario ha apostado en este partido.</p>';
        }
        return `
            <div class="results-votes-grid">
                ${renderVoteColumn('1', count1, names1)}
                ${renderVoteColumn('X', countX, namesX)}
                ${renderVoteColumn('2', count2, names2)}
            </div>
            <p class="stats-total-bets">${total} apuesta${total !== 1 ? 's' : ''} en la porra</p>
        `;
    }

    function renderUserBetPanel(matchId, userId) {
        const pred = getUserPrediction(matchId, userId);
        if (!pred) {
            return '<p class="results-user-bet results-user-bet--none">Sin apuesta</p>';
        }
        const classMap = { '1': 'result-home', X: 'result-draw', '2': 'result-away' };
        return `
            <p class="results-user-bet">
                Apuesta:
                <span class="results-user-bet-pill ${classMap[pred] || ''}">${pred}</span>
            </p>
        `;
    }

    function shouldShowPanel(matchId) {
        if (selectedUserId && expandAll) return true;
        return openMatchIds.has(matchKey(matchId));
    }

    function renderInlinePanel(matchId) {
        if (!shouldShowPanel(matchId)) return '';
        const inner = selectedUserId
            ? renderUserBetPanel(matchId, selectedUserId)
            : renderGroupStatsPanel(matchId);
        return `
            <tr class="results-stats-row" data-match-id="${matchKey(matchId)}">
                <td class="results-date" aria-hidden="true"></td>
                <td colspan="3" class="results-stats-merged">
                    <div class="results-inline-stats">${inner}</div>
                </td>
            </tr>
        `;
    }

    function renderPhaseTable(matches) {
        const rows = matches.map(match => {
            const gl = match.goles_local ?? '—';
            const gv = match.goles_visitante ?? '—';
            const mid = matchKey(match.id);
            const isOpen = shouldShowPanel(mid);
            return `
                <tr class="results-match-row${isOpen ? ' is-expanded' : ''}" data-match-id="${mid}" tabindex="0" role="button">
                    <td class="results-date">${formatDate(match.fecha_inicio)}</td>
                    <td class="results-team-cell results-team-cell-home">
                        ${teamCell(match.equipo_local_nombre, 'home')}
                    </td>
                    <td class="results-score-cell">
                        <span class="results-score">${gl} – ${gv}</span>
                    </td>
                    <td class="results-team-cell results-team-cell-away">
                        ${teamCell(match.equipo_visitante_nombre, 'away')}
                    </td>
                </tr>
                ${renderInlinePanel(mid)}
            `;
        }).join('');

        return `
            <div class="results-table-wrap">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th class="results-date-header">Fecha</th>
                            <th>Local</th>
                            <th class="results-score-header">Resultado</th>
                            <th>Visitante</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderFilterBar() {
        const options = cachedMembers
            .map(m => {
                const selected = selectedUserId && String(m.user_id) === String(selectedUserId) ? ' selected' : '';
                return `<option value="${m.user_id}"${selected}>${m.name}</option>`;
            })
            .join('');

        const expandVisible = !!selectedUserId;
        const expandLabel = expandAll ? 'Plegar' : 'Desglosar todo';

        return `
            <div class="results-filter-bar">
                <label class="results-filter-label" for="results-user-filter">Ver apuestas de</label>
                <select id="results-user-filter" class="results-user-filter">
                    <option value=""${!selectedUserId ? ' selected' : ''}>Todos</option>
                    ${options}
                </select>
                <button type="button" id="results-expand-all-btn" class="btn-secondary results-expand-btn${expandVisible ? '' : ' hidden'}">
                    ${expandLabel}
                </button>
            </div>
        `;
    }

    function toggleMatch(matchId) {
        const key = matchKey(matchId);
        if (selectedUserId && expandAll) {
            expandAll = false;
            openMatchIds = new Set([key]);
            return;
        }
        if (openMatchIds.has(key)) {
            openMatchIds.delete(key);
        } else {
            openMatchIds.add(key);
        }
    }

    function ensureInteractions(container) {
        if (interactionsBound) return;
        interactionsBound = true;

        container.addEventListener('change', (e) => {
            if (e.target?.id !== 'results-user-filter') return;
            selectedUserId = e.target.value || null;
            expandAll = false;
            openMatchIds = new Set();
            refreshPanels(container);
        });

        container.addEventListener('click', (e) => {
            const expandBtn = e.target.closest('#results-expand-all-btn');
            if (expandBtn && container.contains(expandBtn)) {
                e.preventDefault();
                if (!selectedUserId) return;
                expandAll = !expandAll;
                openMatchIds = new Set();
                refreshPanels(container);
                return;
            }

            if (e.target.closest('.results-stats-row details, .results-stats-row summary')) {
                return;
            }

            const row = e.target.closest('.results-match-row');
            if (!row || !container.contains(row)) return;

            toggleMatch(row.getAttribute('data-match-id'));
            refreshPanels(container);
        });

        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const row = e.target.closest?.('.results-match-row');
            if (!row || !container.contains(row)) return;
            e.preventDefault();
            toggleMatch(row.getAttribute('data-match-id'));
            refreshPanels(container);
        });
    }

    function refreshPanels(container) {
        const openPhases = new Set();
        container.querySelectorAll('.phase-section').forEach(sec => {
            const fase = sec.getAttribute('data-fase');
            if (fase && sec.open) openPhases.add(fase);
        });

        const phaseOrder = cachedPhaseOrder || [];
        const phaseGroups = cachedPhaseGroups || {};

        let body = renderFilterBar();
        phaseOrder.forEach(fase => {
            const config = getPhaseConfig(fase);
            const isOpen = openPhases.size === 0
                ? fase === phaseOrder[phaseOrder.length - 1]
                : openPhases.has(fase);
            body += `
                <details class="phase-section" data-fase="${fase}"${isOpen ? ' open' : ''}>
                    <summary class="phase-summary">
                        <span class="phase-label">${config.label}</span>
                        <span class="phase-multiplier">✕${config.multiplier} puntos</span>
                        <span class="phase-count">${(phaseGroups[fase] || []).length} partidos</span>
                        <span class="phase-chevron">›</span>
                    </summary>
                    ${renderPhaseTable(phaseGroups[fase] || [])}
                </details>
            `;
        });

        container.innerHTML = body;
        ensureInteractions(container);
    }

    function buildResultsUi(container, phaseOrder, phaseGroups) {
        cachedPhaseOrder = phaseOrder;
        cachedPhaseGroups = phaseGroups;

        let html = renderFilterBar();
        const defaultOpenPhase = phaseOrder[phaseOrder.length - 1];

        phaseOrder.forEach(fase => {
            const config = getPhaseConfig(fase);
            const isOpen = fase === defaultOpenPhase;
            html += `
                <details class="phase-section" data-fase="${fase}"${isOpen ? ' open' : ''}>
                    <summary class="phase-summary">
                        <span class="phase-label">${config.label}</span>
                        <span class="phase-multiplier">✕${config.multiplier} puntos</span>
                        <span class="phase-count">${phaseGroups[fase].length} partidos</span>
                        <span class="phase-chevron">›</span>
                    </summary>
                    ${renderPhaseTable(phaseGroups[fase])}
                </details>
            `;
        });

        container.innerHTML = html;
        ensureInteractions(container);
    }

    async function loadGroupBets(groupId) {
        if (window.apiClient?.getGroupBets) {
            const rows = await window.apiClient.getGroupBets(groupId);
            console.log('[Resultados] bets via getGroupBets:', rows.length);
            return rows;
        }
        const { data, error } = await window.supabaseClient
            .from('bets')
            .select('*')
            .eq('group_id', groupId);
        if (error) {
            console.warn('[Resultados] Error bets:', error);
            return [];
        }
        return data || [];
    }

    async function loadMemberNames(groupId) {
        const gidNum = Number(groupId);
        const gid = Number.isFinite(gidNum) ? gidNum : groupId;

        const { data: members, error: membersError } = await window.supabaseClient
            .from('group_members')
            .select('user_id')
            .eq('group_id', gid);

        if (membersError) throw membersError;

        const userIds = [...new Set((members || []).map(m => m.user_id).filter(Boolean))];
        const nameByUserId = {};

        if (userIds.length) {
            const { data: users, error: usersError } = await window.supabaseClient
                .from('users')
                .select('id, name')
                .in('id', userIds);

            if (usersError) {
                console.warn('[Resultados] Error cargando nombres:', usersError);
            } else {
                (users || []).forEach(u => {
                    nameByUserId[String(u.id)] = u.name || 'Anónimo';
                });
            }
        }

        return (members || [])
            .map(m => ({
                user_id: m.user_id,
                name: nameByUserId[String(m.user_id)] || 'Anónimo',
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    window.loadResults = async function () {
        const container = document.getElementById('results-container');
        if (!container) return;

        selectedUserId = null;
        expandAll = false;
        openMatchIds = new Set();
        cachedBets = [];
        cachedMembers = [];
        cachedPhaseOrder = [];
        cachedPhaseGroups = {};

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

            const matches = await window.apiClient.getMatches(tournamentId, groupId);
            const finished = (matches || []).filter(m => {
                const fase = m.fase || 'GROUP_STAGE';
                return isValidPhase(fase) && isMatchFinished(m);
            });

            if (finished.length === 0) {
                container.innerHTML = '<p class="stats-empty-message">No hay partidos finalizados todavía.</p>';
                return;
            }

            const [members, rawBets] = await Promise.all([
                loadMemberNames(groupId),
                loadGroupBets(groupId),
            ]);

            cachedMembers = members;
            const nameByUserId = {};
            cachedMembers.forEach(m => {
                nameByUserId[String(m.user_id)] = m.name;
            });

            cachedBets = (rawBets || []).map(b => ({
                ...b,
                prediccion: String(b.prediccion || '').trim().toUpperCase(),
                users: { name: nameByUserId[String(b.user_id)] || 'Anónimo' },
                _userName: nameByUserId[String(b.user_id)] || 'Anónimo',
            }));

            console.log('[Resultados] groupId=', groupId, 'bets=', cachedBets.length, 'matchIds=', cachedBets.map(b => b.match_id));

            const phaseOrder = [];
            const phaseGroups = {};
            finished.forEach(match => {
                const fase = match.fase || 'GROUP_STAGE';
                if (!phaseGroups[fase]) {
                    phaseGroups[fase] = [];
                    phaseOrder.push(fase);
                }
                phaseGroups[fase].push(match);
            });

            buildResultsUi(container, phaseOrder, phaseGroups);
        } catch (error) {
            console.error('Error cargando resultados', error);
            container.innerHTML = `<p class="stats-empty-message stats-error">Error al cargar resultados: ${error.message}</p>`;
        } finally {
            window.hideLoading();
        }
    };
})();

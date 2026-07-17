// js/results.js
// Resultados de partidos finalizados en tabla por fases

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

    function getMatchOutcome(match) {
        const gl = Number(match.goles_local);
        const gv = Number(match.goles_visitante);
        if (gl > gv) {
            return { code: '1', label: 'Local (1)', className: 'result-home' };
        }
        if (gv > gl) {
            return { code: '2', label: 'Visitante (2)', className: 'result-away' };
        }
        return { code: 'X', label: 'Empate (X)', className: 'result-draw' };
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

    function renderPhaseTable(matches) {
        const rows = matches.map(match => {
            const outcome = getMatchOutcome(match);
            const gl = match.goles_local ?? '—';
            const gv = match.goles_visitante ?? '—';
            return `
                <tr>
                    <td class="results-date">${formatDate(match.fecha_inicio)}</td>
                    <td class="results-match-line" colspan="3">
                        <div class="results-line">
                            ${teamCell(match.equipo_local_nombre, 'home')}
                            <span class="results-score">${gl} – ${gv}</span>
                            ${teamCell(match.equipo_visitante_nombre, 'away')}
                        </div>
                    </td>
                    <td>
                        <span class="results-outcome ${outcome.className}">${outcome.label}</span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="results-table-wrap">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th colspan="3">Partido</th>
                            <th>Resultado</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    window.loadResults = async function () {
        const container = document.getElementById('results-container');
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

            const matches = await window.apiClient.getMatches(tournamentId, groupId);
            const finished = (matches || []).filter(m => {
                const fase = m.fase || 'GROUP_STAGE';
                return isValidPhase(fase) && isMatchFinished(m);
            });

            if (finished.length === 0) {
                container.innerHTML = '<p class="stats-empty-message">No hay partidos finalizados todavía.</p>';
                return;
            }

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

            const defaultOpenPhase = phaseOrder[phaseOrder.length - 1];
            container.innerHTML = '';

            phaseOrder.forEach(fase => {
                const config = getPhaseConfig(fase);
                const section = document.createElement('details');
                section.className = 'phase-section';
                if (fase === defaultOpenPhase) section.setAttribute('open', '');

                section.innerHTML = `
                    <summary class="phase-summary">
                        <span class="phase-label">${config.label}</span>
                        <span class="phase-multiplier">✕${config.multiplier} puntos</span>
                        <span class="phase-count">${phaseGroups[fase].length} partidos</span>
                        <span class="phase-chevron">›</span>
                    </summary>
                    ${renderPhaseTable(phaseGroups[fase])}
                `;

                container.appendChild(section);
            });
        } catch (error) {
            console.error('Error cargando resultados', error);
            container.innerHTML = `<p class="stats-empty-message stats-error">Error al cargar resultados: ${error.message}</p>`;
        } finally {
            window.hideLoading();
        }
    };
})();

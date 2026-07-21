// js/scoring-rules.js
// Toggles de puntuación por porra (favorito + generales) + helpers de cálculo

(function () {
    const BOMBO_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

    const RULE_META = [
        {
            key: 'muralla',
            category: 'favorite',
            label: 'Muralla',
            pending: false,
            description: 'Si el favorito gana y deja la portería a 0. Suma puntos × multiplicador de fase.',
            params: [{ key: 'points', label: 'Puntos', default: 2, step: 0.5, min: 0 }],
            icon: 'shield',
        },
        {
            key: 'matagigantes',
            category: 'favorite',
            label: 'Matagigantes',
            pending: false,
            description: 'Si el favorito gana a un rival de bombo superior, los puntos por goles se multiplican.',
            params: [{ key: 'goal_multiplier', label: 'Extra goles', default: 1.5, step: 0.1, min: 1 }],
            icon: 'giant',
        },
        {
            key: 'polvora_mojada',
            category: 'favorite',
            label: 'Pólvora Mojada',
            pending: false,
            description: 'Si el favorito no marca, restas goles recibidos × coeficiente × fase.',
            params: [],
            icon: 'wet',
        },
        {
            key: 'consuelo',
            category: 'favorite',
            label: 'Puntuación de consuelo',
            pending: false,
            description: 'Aunque falles el pronóstico, sumas los puntos de goles/extras del favorito.',
            params: [],
            icon: 'consolation',
        },
        {
            key: 'prorroga_cuenta',
            category: 'general',
            label: 'La Prórroga Cuenta',
            pending: false,
            description: 'Goles y eventos de favorito usan el marcador a tiempo completo (incl. prórroga). La apuesta 1X2 sigue a 90\'.',
            params: [],
            icon: 'clock',
        },
        {
            key: 'lobo_estepario',
            category: 'general',
            label: 'Lobo estepario',
            pending: false,
            description: 'Solo si un único usuario de toda la porra acierta el 1/X/2: cobra los fallos × este multiplicador.',
            params: [{ key: 'multiplier', label: 'Multiplicador', default: 1.5, step: 0.1, min: 1 }],
            icon: 'wolf',
        },
    ];

    function getDefaultScoringRules() {
        const rules = {};
        RULE_META.forEach((meta) => {
            const entry = { enabled: meta.key === 'consuelo' };
            meta.params.forEach((p) => {
                entry[p.key] = p.default;
            });
            rules[meta.key] = entry;
        });
        return rules;
    }

    function normalizeScoringRules(raw) {
        const defaults = getDefaultScoringRules();
        const src = raw && typeof raw === 'object' ? raw : {};
        const out = {};
        RULE_META.forEach((meta) => {
            const d = defaults[meta.key];
            const r = src[meta.key] && typeof src[meta.key] === 'object' ? src[meta.key] : {};
            out[meta.key] = { enabled: r.enabled != null ? !!r.enabled : d.enabled };
            meta.params.forEach((p) => {
                const n = Number(r[p.key]);
                out[meta.key][p.key] = Number.isFinite(n) ? n : d[p.key];
            });
        });
        return out;
    }

    function isEnabled(rules, key) {
        return !!(normalizeScoringRules(rules)[key]?.enabled);
    }

    function bomboRank(letter) {
        const i = BOMBO_ORDER.indexOf(String(letter || '').toUpperCase());
        return i >= 0 ? i : 99;
    }

    /** Goles 90' vs FT para scoring de favorito. Apuesta 1X2 siempre usa 90'. */
    function getMatchGoalsForFavorite(match, rules) {
        const useFt = isEnabled(rules, 'prorroga_cuenta')
            && match?.goles_local_ft != null
            && match?.goles_visitante_ft != null;
        if (useFt) {
            return {
                gl: Number(match.goles_local_ft),
                gv: Number(match.goles_visitante_ft),
                source: 'ft',
            };
        }
        return {
            gl: Number(match?.goles_local),
            gv: Number(match?.goles_visitante),
            source: '90',
        };
    }

    function buildBomboByTeamId(groupValues) {
        const map = {};
        (groupValues || []).forEach((gv) => {
            if (gv.team_id == null || !gv.bombo) return;
            const tid = Number(gv.team_id);
            const key = Number.isFinite(tid) ? tid : String(gv.team_id);
            map[key] = String(gv.bombo).toUpperCase();
            map[String(gv.team_id)] = String(gv.bombo).toUpperCase();
        });
        return map;
    }

    /**
     * Puntos de apuesta con Lobo estepario.
     * Lobo SOLO si exactamente 1 usuario de toda la porra acertó el signo
     * (entre todas las apuestas del partido, no solo el subconjunto Pichichi).
     * Ese acertante cobra: fallos(participantes) * fase * multiplicador Lobo.
     */
    function calcBetPointsForMatchWithRules({ match, bets, participantIds, multiplier, rules }) {
        const PS = window.PichichiScoring;
        if (!PS?.calcBetPointsForMatch) {
            return { resultado: null, failed: 0, correctCount: 0, pointsByUser: {}, pointsForUser: () => 0, lines: [] };
        }

        const base = PS.calcBetPointsForMatch({ match, bets, participantIds, multiplier });
        const r = normalizeScoringRules(rules);
        const lines = [];

        if (!r.lobo_estepario?.enabled || !base.resultado) {
            return { ...base, loboApplied: false, lines };
        }

        const matchKey = (id) => (id == null ? '' : String(id));
        const mid = matchKey(match?.id);
        const correctAmongAllBets = new Set();
        (bets || []).forEach((bet) => {
            if (matchKey(bet.match_id) !== mid) return;
            if (String(bet.prediccion || '').trim().toUpperCase() === base.resultado) {
                correctAmongAllBets.add(String(bet.user_id));
            }
        });

        // Único acertante en toda la porra (quien haya apostado en este partido)
        if (correctAmongAllBets.size !== 1 || base.failed <= 0) {
            return { ...base, loboApplied: false, soleCorrectCount: correctAmongAllBets.size, lines };
        }

        const soleUid = [...correctAmongAllBets][0];
        const loboMult = Number(r.lobo_estepario.multiplier) || 1.5;
        const pts = base.failed * (Number(multiplier) || 1) * loboMult;
        const pointsByUser = {};
        const participants = new Set((participantIds || []).map(String));
        if (participants.has(soleUid)) {
            pointsByUser[soleUid] = pts;
        }

        lines.push({
            key: 'lobo_estepario',
            label: 'Lobo estepario',
            points: pts,
            detail: `único acierto de la porra ×${loboMult}`,
        });

        return {
            ...base,
            correctCount: 1,
            pointsByUser,
            pointsForUser: (userId) => pointsByUser[String(userId)] || 0,
            loboApplied: Object.keys(pointsByUser).length > 0,
            soleCorrectCount: 1,
            lines,
        };
    }

    /**
     * Desglose favorito para un partido (goles base + extras).
     * consuelo OFF + apuesta fallida/ausente → todo a 0.
     */
    function calcFavoriteMatchBreakdown({
        match,
        selections,
        rules,
        maxFifaPoints,
        teamsFifaMap,
        teamsNameToId,
        aliasMap,
        bomboByTeamId,
        userBetCorrect, // true | false | null (sin apuesta)
    }) {
        const PS = window.PichichiScoring;
        const r = normalizeScoringRules(rules);
        const empty = {
            total: 0,
            goalPoints: 0,
            extras: 0,
            pichichiPoints: 0,
            rulesPoints: 0,
            viaConsuelo: false,
            lines: [],
            hasFavorite: false,
            blockedByConsuelo: false,
        };

        if (!PS?.isScoringMatch?.(match) || !selections?.length) return empty;

        const consueloOn = !!r.consuelo?.enabled;
        if (!consueloOn && userBetCorrect !== true) {
            // Aún mostrar si juega favorito, pero puntos 0
            const playing = selections.some((s) => PS.selectionPlaysInMatch(match, s, teamsNameToId, aliasMap));
            return {
                ...empty,
                hasFavorite: playing,
                blockedByConsuelo: playing,
            };
        }

        const goals = getMatchGoalsForFavorite(match, r);
        if (!Number.isFinite(goals.gl) || !Number.isFinite(goals.gv)) return empty;

        const phaseMult = PS.getPhaseMultiplier(match.fase);
        const maxFifa = Number(maxFifaPoints) > 0 ? Number(maxFifaPoints) : 1000;
        const lines = [];
        let goalPoints = 0;
        let extras = 0;
        let hasFavorite = false;

        selections.forEach((selection) => {
            const selectionId = PS.getSelectionTeamId(selection);
            if (selectionId == null) return;

            const localId = PS.resolveMatchTeamId(match, 'local', teamsNameToId, aliasMap);
            const awayId = PS.resolveMatchTeamId(match, 'away', teamsNameToId, aliasMap);

            let scored = 0;
            let conceded = 0;
            let played = false;
            let isHome = false;

            if (PS.sameTeamId(localId, selectionId)) {
                scored = goals.gl;
                conceded = goals.gv;
                played = true;
                isHome = true;
            } else if (PS.sameTeamId(awayId, selectionId)) {
                scored = goals.gv;
                conceded = goals.gl;
                played = true;
                isHome = false;
            }

            if (!played) return;
            hasFavorite = true;

            const teamName = PS.getSelectionTeamName(selection);
            const teamFifa = PS.getSelectionFifaPoints(selection, teamsFifaMap);
            const safeFifa = teamFifa > 0 ? teamFifa : 1000;
            const goalFactor = maxFifa / safeFifa;

            let matagigantesMult = 1;
            const won = scored > conceded;
            if (r.matagigantes?.enabled && won) {
                const favBombo = bomboByTeamId[selectionId] || bomboByTeamId[String(selectionId)];
                const rivalId = isHome ? awayId : localId;
                const rivalBombo = bomboByTeamId[rivalId] || bomboByTeamId[String(rivalId)];
                if (favBombo && rivalBombo && bomboRank(rivalBombo) < bomboRank(favBombo)) {
                    matagigantesMult = Number(r.matagigantes.goal_multiplier) || 1.5;
                }
            }

            const baseGoals = scored * phaseMult * goalFactor * matagigantesMult;
            goalPoints += baseGoals;
            lines.push({
                key: 'goals',
                label: 'Goles Pichichi',
                points: baseGoals,
                detail: `${teamName}: ${scored} gol(es) × fase x${phaseMult} × valor ${goalFactor.toFixed(2)}${matagigantesMult > 1 ? ` × Matagigantes x${matagigantesMult}` : ''}${goals.source === 'ft' ? ' (FT)' : ''}`,
            });

            if (matagigantesMult > 1) {
                lines.push({
                    key: 'matagigantes',
                    label: 'Matagigantes',
                    points: 0,
                    detail: `activo ×${matagigantesMult} sobre goles`,
                });
            }

            if (r.muralla?.enabled && won && conceded === 0) {
                const murallaPts = (Number(r.muralla.points) || 0) * phaseMult;
                extras += murallaPts;
                lines.push({
                    key: 'muralla',
                    label: 'Muralla',
                    points: murallaPts,
                    detail: `${teamName}: portería a 0`,
                });
            }

            if (r.polvora_mojada?.enabled && scored === 0) {
                const polvoraPts = -(conceded * phaseMult * goalFactor);
                extras += polvoraPts;
                lines.push({
                    key: 'polvora_mojada',
                    label: 'Pólvora Mojada',
                    points: polvoraPts,
                    detail: `${teamName}: 0 goles, ${conceded} recibidos`,
                });
            }
        });

        const total = goalPoints + extras;
        const viaConsuelo = userBetCorrect !== true;
        // Apuesta fallida/ausente + consuelo: todo el favorito es "Regla". Acierto: goles = Pichichi, extras = Reglas.
        const annotatedLines = lines.map((line) => {
            if (viaConsuelo) {
                if (line.key === 'goals') {
                    return {
                        ...line,
                        category: 'regla',
                        label: 'Consuelo (goles)',
                        detail: `${line.detail || ''} · vía Consuelo`.trim(),
                    };
                }
                return { ...line, category: 'regla' };
            }
            if (line.key === 'goals') return { ...line, category: 'pichichi' };
            return { ...line, category: 'regla' };
        });

        return {
            total,
            goalPoints,
            extras,
            pichichiPoints: viaConsuelo ? 0 : goalPoints,
            rulesPoints: viaConsuelo ? total : extras,
            viaConsuelo,
            lines: annotatedLines,
            hasFavorite,
            blockedByConsuelo: false,
        };
    }

    function svgIcon(name) {
        const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
        const paths = {
            shield: `<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>`,
            card: `<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6"/>`,
            glove: `<path d="M8 11V7a2 2 0 014 0v1"/><path d="M12 8V6a2 2 0 014 0v5"/><path d="M16 11v-1a2 2 0 014 0v5a5 5 0 01-5 5H9a4 4 0 01-4-4v-3a2 2 0 014 0"/>`,
            miss: `<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/>`,
            giant: `<path d="M12 4v4M8 8h8"/><path d="M7 20l2-8h6l2 8"/><path d="M9 12h6"/>`,
            wet: `<path d="M12 3c-2 4-5 6.5-5 10a5 5 0 0010 0c0-3.5-3-6-5-10z"/><path d="M9 17h.01M12 18h.01"/>`,
            consolation: `<path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/>`,
            clock: `<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>`,
            late: `<path d="M4 12h10"/><path d="M14 8l4 4-4 4"/><path d="M5 7v10"/>`,
            wolf: `<path d="M4 14l3-6 2 2 3-5 3 5 2-2 3 6"/><path d="M8 18h8"/><path d="M10 14v4M14 14v4"/>`,
            wildcard: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>`,
        };
        return `<svg class="rule-icon-svg" ${common} aria-hidden="true">${paths[name] || paths.shield}</svg>`;
    }

    function formatPts(n) {
        const v = Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
        const sign = v > 0 ? '+' : '';
        return `${sign}${v.toFixed(2)}`;
    }

    function renderActiveRulesChipsHtml(rules) {
        const r = normalizeScoringRules(rules);
        const chips = RULE_META.filter((m) => r[m.key]?.enabled).map((m) => {
            const desc = String(m.description || '').replace(/"/g, '&quot;');
            const label = String(m.label || '').replace(/"/g, '&quot;');
            return `
                <button type="button" class="rule-chip" data-rule-key="${m.key}"
                    data-rule-label="${label}" data-rule-desc="${desc}"
                    title="${label}" aria-pressed="false">
                    <span class="rule-icon-relief rule-icon-relief--sm">${svgIcon(m.icon)}</span>
                    <span class="rule-chip-label">${m.label}</span>
                </button>`;
        });
        if (!chips.length) {
            return '<p class="rules-chips-empty text-muted">Sin reglas especiales activas (solo puntuación base).</p>';
        }
        return `<div class="rules-chips">${chips.join('')}</div>`;
    }

    function bindActiveRulesChips(containerEl, descEl) {
        if (!containerEl || !descEl) return;
        if (containerEl.dataset.rulesBound === '1') return;
        containerEl.dataset.rulesBound = '1';

        containerEl.addEventListener('click', (e) => {
            const chip = e.target.closest('.rule-chip[data-rule-key]');
            if (!chip || !containerEl.contains(chip)) return;

            const wasActive = chip.classList.contains('is-active');
            containerEl.querySelectorAll('.rule-chip.is-active').forEach((c) => {
                c.classList.remove('is-active');
                c.setAttribute('aria-pressed', 'false');
            });

            if (wasActive) {
                descEl.hidden = true;
                descEl.innerHTML = '';
                return;
            }

            chip.classList.add('is-active');
            chip.setAttribute('aria-pressed', 'true');
            const label = chip.getAttribute('data-rule-label') || '';
            const desc = chip.getAttribute('data-rule-desc') || '';
            descEl.hidden = false;
            descEl.innerHTML = `<strong class="active-rule-desc-title">${label}</strong>
                <p class="active-rule-desc-text">${desc}</p>`;
        });
    }

    function renderAdminRulesFormHtml(rules) {
        const r = normalizeScoringRules(rules);
        const block = (category, title) => {
            const items = RULE_META.filter((m) => m.category === category).map((m) => {
                const en = r[m.key];
                const pendingBadge = m.pending
                    ? '<span class="rule-pending-badge">Próximamente</span>'
                    : '';
                const paramsHtml = m.params.map((p) => `
                    <label class="rule-param">
                        <span>${p.label}</span>
                        <input type="number" class="rule-param-input"
                            data-rule="${m.key}" data-param="${p.key}"
                            value="${en[p.key]}" min="${p.min}" step="${p.step}"
                            ${en.enabled ? '' : 'disabled'}>
                    </label>`).join('');
                return `
                    <div class="rule-toggle-card" data-rule-key="${m.key}">
                        <div class="rule-toggle-head">
                            <span class="rule-icon-relief">${svgIcon(m.icon)}</span>
                            <div class="rule-toggle-text">
                                <div class="rule-toggle-title-row">
                                    <strong>${m.label}</strong>
                                    ${pendingBadge}
                                </div>
                                <p class="rule-toggle-desc">${m.description}</p>
                            </div>
                            <label class="toggle-switch rule-toggle-switch" for="rule-${m.key}">
                                <input type="checkbox" id="rule-${m.key}" data-rule-enabled="${m.key}" ${en.enabled ? 'checked' : ''}>
                                <span class="toggle-slider" aria-hidden="true"></span>
                            </label>
                        </div>
                        ${paramsHtml ? `<div class="rule-params">${paramsHtml}</div>` : ''}
                    </div>`;
            }).join('');
            return `<h4 class="rules-block-title">${title}</h4><div class="rules-block">${items}</div>`;
        };

        return `
            ${block('favorite', 'Toggles de Equipo Favorito')}
            ${block('general', 'Toggles de Porra General')}
            <button type="submit" class="btn-primary" style="margin-top: 1rem;">Guardar reglas</button>
        `;
    }

    function readRulesFromForm(formEl) {
        const rules = getDefaultScoringRules();
        if (!formEl) return rules;
        RULE_META.forEach((m) => {
            const cb = formEl.querySelector(`[data-rule-enabled="${m.key}"]`);
            rules[m.key].enabled = !!cb?.checked;
            m.params.forEach((p) => {
                const input = formEl.querySelector(`[data-rule="${m.key}"][data-param="${p.key}"]`);
                const n = Number(input?.value);
                rules[m.key][p.key] = Number.isFinite(n) ? n : p.default;
            });
        });
        return rules;
    }

    window.ScoringRules = {
        RULE_META,
        BOMBO_ORDER,
        getDefaultScoringRules,
        normalizeScoringRules,
        isEnabled,
        getMatchGoalsForFavorite,
        buildBomboByTeamId,
        calcBetPointsForMatchWithRules,
        calcFavoriteMatchBreakdown,
        renderActiveRulesChipsHtml,
        bindActiveRulesChips,
        renderAdminRulesFormHtml,
        readRulesFromForm,
        formatPts,
        svgIcon,
    };
})();

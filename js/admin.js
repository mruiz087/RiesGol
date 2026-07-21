// js/admin.js
// Lógica para la administración de porras

const Admin = {
    teamValuesSearchQuery: '',

    // Verificar si el usuario es admin del grupo actual
    isAdmin: async (groupId, userId) => {
        if (!groupId || !userId) return false;
        
        const { data } = await window.supabaseClient
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();
        
        return data?.role === 'admin';
    },

    // Cargar miembros del grupo
    loadGroupMembers: async () => {
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        const members = await window.apiClient.getGroupMembers(groupId);
        const container = document.getElementById('group-members-container');
        
        if (!members || members.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay miembros en esta porra.</p>';
            return;
        }

        const currentUser = window.getCurrentUser();
        const isCurrentUserAdmin = await Admin.isAdmin(groupId, currentUser?.id);

        container.innerHTML = `
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        ${isCurrentUserAdmin ? '<th>Acciones</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${members.map(member => `
                        <tr>
                            <td>${member.users?.name || 'Anónimo'}</td>
                            <td>
                                <span class="badge ${member.role === 'admin' ? 'gold' : 'secondary'}">
                                    ${member.role === 'admin' ? 'Admin' : 'Miembro'}
                                </span>
                            </td>
                            ${isCurrentUserAdmin && member.user_id !== currentUser?.id ? `
                                <td>
                                    <button class="btn-secondary btn-sm" onclick="Admin.kickMember('${member.user_id}')">Expulsar</button>
                                </td>
                            ` : isCurrentUserAdmin ? '<td></td>' : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // Expulsar miembro del grupo
    kickMember: async (userIdToKick) => {
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        if (!confirm('¿Seguro que quieres expulsar a este usuario de la porra?')) return;

        const result = await window.apiClient.kickMember(groupId, userIdToKick);
        if (result.success) {
            window.toast?.success('Usuario expulsado de la porra');
            Admin.loadGroupMembers();
        } else {
            window.toast?.error(result.error || 'No se pudo expulsar al usuario');
        }
    },

    // Cargar configuración del premio especial
    loadSpecialPrizeConfig: async () => {
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        const { data: group } = await window.supabaseClient
            .from('groups')
            .select('special_prize_enabled, special_position')
            .eq('id', groupId)
            .single();

        if (group) {
            const enabled = group.special_prize_enabled || false;
            const enabledEl = document.getElementById('special-prize-enabled');
            if (enabledEl) enabledEl.checked = enabled;
            document.getElementById('special-position-group').style.display = enabled ? 'block' : 'none';
            await Admin.populateSpecialPositionSelect(group.special_position || null);
        }
    },

    populateSpecialPositionSelect: async (selectedPosition = null) => {
        const select = document.getElementById('special-position');
        const hint = document.getElementById('special-position-hint');
        if (!select) return;

        const groupId = window.Groups?.currentGroupId;
        let memberCount = 0;
        if (groupId && window.apiClient?.getGroupMembers) {
            const members = await window.apiClient.getGroupMembers(groupId);
            memberCount = members?.length || 0;
        }

        const current = selectedPosition != null && selectedPosition !== ''
            ? Number(selectedPosition)
            : Number(select.value) || null;

        select.innerHTML = '';
        if (memberCount === 0) {
            select.disabled = true;
            select.innerHTML = '<option value="">Sin jugadores</option>';
            if (hint) {
                hint.textContent = 'Añade jugadores a la porra antes de elegir la posición.';
            }
            return;
        }

        select.disabled = false;
        for (let i = 1; i <= memberCount; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = `${i}º`;
            select.appendChild(opt);
        }

        const pick = Number.isFinite(current) && current >= 1 && current <= memberCount
            ? current
            : Math.min(3, memberCount);
        select.value = String(pick);

        if (hint) {
            const tip = pick === 1 || pick === 2
                ? ' Nota: 1º y 2º ya aparecen en el podio principal.'
                : '';
            hint.textContent =
                `Hay ${memberCount} jugador${memberCount !== 1 ? 'es' : ''} en la porra. Elige la posición del premio especial (1–${memberCount}).${tip}`;
        }
    },

    updateSpecialPositionHint: async () => {
        const select = document.getElementById('special-position');
        const selected = select?.value ? Number(select.value) : null;
        await Admin.populateSpecialPositionSelect(selected);
    },

    setSegmentedControlValue: (value) => {
        const hidden = document.getElementById('tournament-status');
        if (hidden) hidden.value = value || 'draft';

        document.querySelectorAll('#tournament-status-control .segmented-control-btn').forEach(btn => {
            const isActive = btn.dataset.value === (value || 'draft');
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    },

    // Cargar estado del torneo
    loadTournamentStatus: async () => {
        const tournamentId = window.Groups?.currentTournamentId;
        if (!tournamentId) return;

        const { data: tournament } = await window.supabaseClient
            .from('tournaments')
            .select('estado')
            .eq('id', tournamentId)
            .single();

        if (tournament) {
            Admin.setSegmentedControlValue(tournament.estado || 'draft');
        }
    },

    // Guardar configuración de premio especial
    saveSpecialPrizeConfig: async (e) => {
        e.preventDefault();
        
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        const enabled = document.getElementById('special-prize-enabled').checked;
        const positionRaw = document.getElementById('special-position').value;
        const position = enabled ? parseInt(positionRaw, 10) : null;

        if (enabled) {
            if (!Number.isFinite(position) || position < 1) {
                window.toast?.warning('Elige una posición válida');
                return;
            }

            const members = await window.apiClient.getGroupMembers(groupId);
            const memberCount = members?.length || 0;

            if (memberCount === 0) {
                window.toast?.warning('No hay miembros en la porra todavía');
                return;
            }

            if (position > memberCount) {
                window.toast?.warning(
                    `Solo hay ${memberCount} jugador${memberCount !== 1 ? 'es' : ''}. Elige una posición entre 1 y ${memberCount}.`
                );
                return;
            }
        }

        const result = await window.apiClient.updateSpecialPrize(groupId, enabled, position);
        if (result?.success || result === true) {
            if (enabled) {
                window.toast?.success(`Premio especial: posición ${position}. Ábrelo en Clasificación para verlo en el podio.`);
            } else {
                window.toast?.success('Premio especial desactivado');
            }
            await Admin.loadSpecialPrizeConfig();
        } else {
            window.toast?.error(result?.error || 'Error al guardar configuración');
        }
    },

    // Guardar estado del torneo
    saveTournamentStatus: async (e) => {
        e.preventDefault();
        
        const tournamentId = window.Groups?.currentTournamentId;
        if (!tournamentId) return;

        const status = document.getElementById('tournament-status').value;

        const success = await window.apiClient.updateTournamentStatus(tournamentId, status);
        if (success) {
            window.toast?.success('Estado del torneo actualizado');
        } else {
            window.toast?.error('Error al actualizar estado del torneo');
        }
    },

    // Eliminar porra (hard delete)
    deleteCurrentGroup: async () => {
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        if (!confirm('¿Seguro que quieres ELIMINAR la porra? Esta acción no se puede deshacer.')) return;

        window.showLoading();
        try {
            const result = await window.apiClient.deleteGroup(groupId);
            if (!result.success) {
                window.toast?.error(result.error || 'No se pudo eliminar la porra');
                return;
            }

            window.toast?.success('Porra eliminada');
            window.Groups?.returnToList();
            window.Groups?.loadUserGroups();
        } finally {
            window.hideLoading();
        }
    },

    BOMBO_OPTIONS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],

    displayTeamName: (name) => {
        if (typeof window.translateTeamName === 'function') {
            return window.translateTeamName(name);
        }
        return name;
    },

    isTeamConfigured: (cfg) => {
        if (!cfg) return false;
        const valor = cfg.valor != null ? Number(cfg.valor) : NaN;
        const bombo = (cfg.bombo || '').trim();
        return Number.isFinite(valor) && valor > 0 && /^[A-Z]$/.test(bombo);
    },

    buildBomboChips: (teamId, selected) => {
        return Admin.BOMBO_OPTIONS.map(letter => {
            const sel = selected === letter ? ' selected' : '';
            return `<button type="button" class="bombo-chip${sel}" data-team-id="${teamId}" data-bombo="${letter}" aria-pressed="${selected === letter}">${letter}</button>`;
        }).join('');
    },

    buildTeamRow: (team, cfg) => {
        const valor = cfg?.valor != null ? Number(cfg.valor).toFixed(2) : '';
        const bombo = cfg?.bombo || '';
        const displayName = Admin.displayTeamName(team.nombre);
        const searchKey = `${team.nombre} ${displayName}`.toLowerCase();

        return `
            <div class="admin-team-row" data-team-id="${team.id}" data-search="${searchKey}">
                <div class="admin-team-info">
                    <span class="admin-team-name">${displayName}</span>
                </div>
                <input type="number" class="team-valor-input admin-valor-input" step="0.01" min="0"
                       value="${valor}" placeholder="0.00" inputmode="decimal">
                <div class="bombo-chip-group" role="group" aria-label="Bombo de ${displayName}">
                    ${Admin.buildBomboChips(team.id, bombo)}
                </div>
            </div>
        `;
    },

    bindTeamValuesEditorEvents: (container) => {
        container.querySelectorAll('.bombo-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const row = chip.closest('.admin-team-row');
                if (!row) return;
                row.querySelectorAll('.bombo-chip').forEach(c => {
                    c.classList.remove('selected');
                    c.setAttribute('aria-pressed', 'false');
                });
                chip.classList.add('selected');
                chip.setAttribute('aria-pressed', 'true');
            });
        });

        const searchInput = document.getElementById('team-values-search');
        if (searchInput && searchInput.dataset.bound !== '1') {
            searchInput.dataset.bound = '1';
            searchInput.value = Admin.teamValuesSearchQuery;
            searchInput.addEventListener('input', (e) => {
                Admin.teamValuesSearchQuery = e.target.value.trim().toLowerCase();
                Admin.filterTeamRows(Admin.teamValuesSearchQuery);
            });
        }

        container.querySelectorAll('.admin-accordion').forEach(accordion => {
            accordion.addEventListener('toggle', (e) => {
                const details = e.target;
                if (!details.open || !(details instanceof HTMLDetailsElement)) return;
                container.querySelectorAll('.admin-accordion').forEach(other => {
                    if (other !== details) other.open = false;
                });
            });
        });
    },

    filterTeamRows: (query) => {
        const container = document.getElementById('team-values-editor');
        if (!container) return;

        container.querySelectorAll('.admin-team-row').forEach(row => {
            const key = row.getAttribute('data-search') || '';
            const match = !query || key.includes(query);
            row.classList.toggle('hidden-by-search', !match);
        });

        container.querySelectorAll('.admin-accordion').forEach(section => {
            const visible = section.querySelectorAll('.admin-team-row:not(.hidden-by-search)').length;
            section.classList.toggle('admin-accordion-empty', visible === 0 && !!query);
        });
    },

    syncMatchesForTournament: async (tournamentId, { silent = false } = {}) => {
        if (!silent) {
            window.toast?.info('Sincronizando partidos…');
        }

        const result = await window.apiClient.syncMatches(tournamentId);

        if (result.error) {
            window.toast?.error(result.error);
            return { success: false, matchCount: 0 };
        }

        if (!silent) {
            if (result.matchCount === 0) {
                window.toast?.warning(
                    'No se encontraron partidos. Comprueba que el año del torneo (anio) sea correcto o que la API tenga datos disponibles.'
                );
            } else {
                window.toast?.success(result.message || `Sincronizados ${result.matchCount} partidos`);
            }
        }

        return { success: true, matchCount: result.matchCount ?? 0 };
    },

    renderTeamValuesEditor: (container, teams, groupValues) => {
        const valuesByTeamId = {};
        (groupValues || []).forEach(gv => { valuesByTeamId[gv.team_id] = gv; });

        const configuredCount = teams.filter(t => Admin.isTeamConfigured(valuesByTeamId[t.id])).length;
        const unassigned = [];
        const byBombo = {};
        Admin.BOMBO_OPTIONS.forEach(b => { byBombo[b] = []; });

        teams.forEach(team => {
            const cfg = valuesByTeamId[team.id];
            if (!Admin.isTeamConfigured(cfg)) {
                unassigned.push(team);
                return;
            }
            const bombo = cfg.bombo.toUpperCase();
            if (byBombo[bombo]) byBombo[bombo].push(team);
            else unassigned.push(team);
        });

        const buildSection = (title, teamList, openByDefault) => {
            if (!teamList.length) return '';
            const rows = teamList.map(t => Admin.buildTeamRow(t, valuesByTeamId[t.id])).join('');
            return `
                <details class="admin-accordion"${openByDefault ? ' open' : ''}>
                    <summary class="admin-accordion-summary">
                        <span>${title}</span>
                        <span class="admin-accordion-count">${teamList.length}</span>
                    </summary>
                    <div class="admin-accordion-body">${rows}</div>
                </details>
            `;
        };

        const bomboSections = Admin.BOMBO_OPTIONS
            .map(b => buildSection(`Bombo ${b}`, byBombo[b], false))
            .join('');

        container.innerHTML = `
            <div class="admin-team-values-toolbar">
                <input type="search" id="team-values-search" class="admin-search-input"
                       placeholder="Buscar equipo…" autocomplete="off">
                <div class="admin-progress">
                    <span class="admin-progress-value">${configuredCount} / ${teams.length}</span>
                    <span class="admin-progress-label">equipos configurados</span>
                </div>
            </div>
            ${buildSection('Sin asignar', unassigned, unassigned.length > 0)}
            ${bomboSections}
            <p class="admin-team-values-hint">
                Los cambios recalculan puntuaciones Pichichi al instante.
            </p>
        `;

        Admin.bindTeamValuesEditorEvents(container);
        if (Admin.teamValuesSearchQuery) {
            Admin.filterTeamRows(Admin.teamValuesSearchQuery);
        }
    },

    showNoTeamsMessage: (container) => {
        container.innerHTML = `
            <p class="text-muted">
                No hay equipos en el catálogo. Pulsa <strong>Sincronizar partidos</strong> para descargarlos
                desde football-data.org. Si el torneo aún no tiene calendario publicado, no habrá equipos disponibles.
            </p>
        `;
    },

    loadTeamValuesEditor: async () => {
        const groupId = window.Groups?.currentGroupId;
        const tournamentId = window.Groups?.currentTournamentId;
        const container = document.getElementById('team-values-editor');
        if (!container) return;

        if (!groupId || !tournamentId) {
            container.innerHTML = '<p class="text-muted">Selecciona una porra primero.</p>';
            return;
        }

        container.innerHTML = '<p class="text-muted">Cargando equipos…</p>';

        let matches = await window.apiClient.getMatches(tournamentId);

        if (!matches || matches.length === 0) {
            await Admin.syncMatchesForTournament(tournamentId);
            matches = await window.apiClient.getMatches(tournamentId);
        }

        await window.apiClient.ensureTeamsFromMatches(tournamentId);

        let teams = await window.apiClient.getTeams(tournamentId);
        const groupValues = await window.apiClient.getGroupTeamValues(groupId);

        if (!teams || teams.length === 0) {
            Admin.showNoTeamsMessage(container);
            return;
        }

        Admin.renderTeamValuesEditor(container, teams, groupValues);
    },

    saveTeamValues: async (e) => {
        e.preventDefault();

        const groupId = window.Groups?.currentGroupId;
        if (!groupId) {
            window.toast?.warning('Selecciona una porra primero.');
            return;
        }

        const rows = [];
        const errors = [];

        document.querySelectorAll('#team-values-editor .admin-team-row[data-team-id]').forEach((rowEl, idx) => {
            const teamId = parseInt(rowEl.getAttribute('data-team-id'), 10);
            const valorRaw = rowEl.querySelector('.team-valor-input')?.value?.trim();
            const selectedChip = rowEl.querySelector('.bombo-chip.selected');
            const bombo = selectedChip?.dataset?.bombo?.trim().toUpperCase() || '';

            if (!valorRaw && !bombo) return;

            const valor = Number(String(valorRaw).replace(',', '.'));
            if (!Number.isFinite(valor) || valor <= 0) {
                errors.push(`Fila ${idx + 1}: valor inválido`);
                return;
            }
            if (!bombo || !/^[A-Z]$/.test(bombo)) {
                errors.push(`Fila ${idx + 1}: selecciona un bombo (A–L)`);
                return;
            }

            rows.push({
                team_id: teamId,
                valor: Math.round((valor + Number.EPSILON) * 100) / 100,
                bombo
            });
        });

        if (errors.length > 0) {
            window.toast?.error(errors[0]);
            return;
        }

        if (rows.length === 0) {
            window.toast?.warning('Rellena al menos un equipo con valor y bombo.');
            return;
        }

        window.showLoading();
        try {
            const result = await window.apiClient.upsertGroupTeamValues(groupId, rows);
            if (result.error) {
                window.toast?.error(result.error);
                return;
            }
            window.toast?.success(`Configuración guardada (${rows.length} equipos)`);
            Admin.loadTeamValuesEditor();
        } finally {
            window.hideLoading();
        }
    },

    // Actualizar visibilidad del enlace de admin
    updateAdminLinkVisibility: async () => {
        const groupId = window.Groups?.currentGroupId;
        const currentUser = window.getCurrentUser();
        const adminLink = document.getElementById('admin-link');
        
        if (!adminLink) return;
        const adminItem = document.getElementById('admin-nav-item') || adminLink.closest('li');

        if (!groupId || !currentUser) {
            if (adminItem) adminItem.style.display = 'none';
            else adminLink.style.display = 'none';
            return;
        }

        const isAdmin = await Admin.isAdmin(groupId, currentUser.id);
        if (adminItem) {
            adminItem.style.display = isAdmin ? '' : 'none';
            adminLink.style.display = '';
        } else {
            adminLink.style.display = isAdmin ? '' : 'none';
        }
    },

    loadScoringRulesEditor: async () => {
        const form = document.getElementById('scoring-rules-form');
        if (!form || !window.ScoringRules) return;

        const groupId = window.Groups?.currentGroupId;
        if (!groupId) {
            form.innerHTML = '<p class="text-muted">Selecciona una porra primero.</p>';
            return;
        }

        const rules = await window.apiClient.getScoringRules(groupId);
        form.innerHTML = window.ScoringRules.renderAdminRulesFormHtml(rules);

        form.querySelectorAll('[data-rule-enabled]').forEach((cb) => {
            cb.addEventListener('change', () => {
                const key = cb.getAttribute('data-rule-enabled');
                form.querySelectorAll(`[data-rule="${key}"]`).forEach((input) => {
                    input.disabled = !cb.checked;
                });
            });
        });
    },

    saveScoringRulesConfig: async (e) => {
        e.preventDefault();
        const groupId = window.Groups?.currentGroupId;
        const form = document.getElementById('scoring-rules-form');
        if (!groupId || !form || !window.ScoringRules) return;

        const rules = window.ScoringRules.readRulesFromForm(form);
        window.showLoading?.();
        try {
            const result = await window.apiClient.updateScoringRules(groupId, rules);
            if (result?.success) {
                window.toast?.success('Reglas de puntuación guardadas');
                await Admin.loadScoringRulesEditor();
            } else {
                window.toast?.error(result?.error || 'No se pudieron guardar las reglas');
            }
        } finally {
            window.hideLoading?.();
        }
    },

    csvEscape(value) {
        if (value == null) return '';
        const s = String(value);
        if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    },

    toCsv(headers, rows) {
        const lines = [headers.join(',')];
        rows.forEach((row) => {
            lines.push(headers.map((h) => Admin.csvEscape(row[h])).join(','));
        });
        return `\uFEFF${lines.join('\n')}`;
    },

    downloadBlob(filename, text) {
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    },

    slugify(name) {
        return String(name || 'porra')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40) || 'porra';
    },

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },

    updateExportButtonState() {
        const btn = document.getElementById('admin-export-btn');
        if (!btn) return;
        const any = ['export-equipos', 'export-partidos', 'export-usuarios']
            .some((id) => document.getElementById(id)?.checked);
        btn.disabled = !any;
    },

    buildEquiposCsv(teams, groupValues) {
        const byId = new Map((groupValues || []).map((gv) => [String(gv.team_id), gv]));
        const translate = window.translateTeamName || ((n) => n);
        const headers = ['Equipo', 'Bombo', 'Coeficiente'];
        const rows = (teams || [])
            .slice()
            .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))
            .map((t) => {
                const gv = byId.get(String(t.id));
                return {
                    Equipo: translate(t.nombre || ''),
                    Bombo: gv?.bombo ?? '',
                    Coeficiente: gv?.valor ?? '',
                };
            });
        return Admin.toCsv(headers, rows);
    },

    phaseLabel(fase) {
        const map = {
            QUALIFICATION: 'Clasificación',
            PRELIMINARY_ROUND: 'Ronda preliminar',
            QUALIFYING_ROUND: 'Ronda clasificatoria',
            ROUND_1: 'Primera ronda',
            ROUND_2: 'Segunda ronda',
            ROUND_3: 'Tercera ronda',
            ROUND_4: 'Cuarta ronda',
            GROUP_STAGE: 'Fase de Grupos',
            LEAGUE_STAGE: 'Fase liga',
            LAST_64: 'Treintaidosavos',
            LAST_32: 'Dieciseisavos',
            PLAYOFFS: 'Playoffs',
            PLAYOFF_ROUND_1: 'Playoff R1',
            PLAYOFF_ROUND_2: 'Playoff R2',
            LAST_16: 'Octavos',
            ROUND_OF_16: 'Octavos',
            QUARTER_FINALS: 'Cuartos',
            SEMI_FINALS: 'Semifinal',
            FINAL: 'Final',
            THIRD_PLACE: 'Tercer puesto',
            THIRD_PLACE_MATCH: 'Tercer puesto',
        };
        const key = String(fase || 'GROUP_STAGE').toUpperCase().replace(/ /g, '_');
        return map[key] || fase || '';
    },

    buildPartidosCsv(matches) {
        const translate = window.translateTeamName || ((n) => n);
        const PS = window.PichichiScoring;
        const headers = [
            'Fase', 'Equipo_local', 'Goles_local', 'Goles_visitante', 'Equipo_visitante', 'Resultado',
        ];
        const sorted = (matches || [])
            .filter((m) => {
                const f = m.fase || '';
                return f !== 'THIRD_PLACE' && f !== 'THIRD_PLACE_MATCH';
            })
            .slice()
            .sort((a, b) => {
                const ta = new Date(a.fecha_inicio || 0).getTime();
                const tb = new Date(b.fecha_inicio || 0).getTime();
                return ta - tb;
            });

        const rows = sorted.map((m) => {
            const res = PS?.getMatchResult?.(m);
            return {
                Fase: Admin.phaseLabel(m.fase),
                Equipo_local: translate(m.equipo_local_nombre || ''),
                Goles_local: m.goles_local ?? '',
                Goles_visitante: m.goles_visitante ?? '',
                Equipo_visitante: translate(m.equipo_visitante_nombre || ''),
                Resultado: res || '',
            };
        });
        return Admin.toCsv(headers, rows);
    },

    /**
     * Matriz estilo captura: Equipo1 | Equipo2 | Res | Usuario1 | Usuario2 | …
     * + bloque final de favoritos.
     */
    buildUsuariosCsv(members, bets, favorites, matches) {
        const translate = window.translateTeamName || ((n) => n);
        const PS = window.PichichiScoring;

        const users = (members || [])
            .map((m) => ({
                id: String(m.user_id),
                name: m.users?.name || m.name || 'Anónimo',
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        const betByUserMatch = new Map();
        (bets || []).forEach((b) => {
            betByUserMatch.set(`${String(b.user_id)}|${String(b.match_id)}`, b);
        });

        const sortedMatches = (matches || [])
            .filter((m) => {
                const f = m.fase || '';
                return f !== 'THIRD_PLACE' && f !== 'THIRD_PLACE_MATCH';
            })
            .slice()
            .sort((a, b) => {
                const ta = new Date(a.fecha_inicio || 0).getTime();
                const tb = new Date(b.fecha_inicio || 0).getTime();
                return ta - tb;
            });

        const headers = ['Equipo_1', 'Equipo_2', 'Res', ...users.map((u) => u.name)];
        const rows = sortedMatches.map((m) => {
            const res = PS?.getMatchResult?.(m) || '';
            const row = {
                Equipo_1: translate(m.equipo_local_nombre || ''),
                Equipo_2: translate(m.equipo_visitante_nombre || ''),
                Res: res,
            };
            users.forEach((u) => {
                const bet = betByUserMatch.get(`${u.id}|${String(m.id)}`);
                row[u.name] = bet?.prediccion ? String(bet.prediccion).trim().toUpperCase() : '';
            });
            return row;
        });

        let csv = Admin.toCsv(headers, rows);

        // Bloque favoritos al final (como hoja de referencia)
        const favHeaders = ['Usuario', 'Bombo', 'Equipo'];
        const favRows = (favorites || [])
            .slice()
            .sort((a, b) => {
                const na = users.find((u) => u.id === String(a.user_id))?.name || '';
                const nb = users.find((u) => u.id === String(b.user_id))?.name || '';
                if (na !== nb) return na.localeCompare(nb, 'es');
                return String(a.bombo || '').localeCompare(String(b.bombo || ''));
            })
            .map((f) => ({
                Usuario: users.find((u) => u.id === String(f.user_id))?.name || '',
                Bombo: f.bombo || '',
                Equipo: translate(f.teams?.nombre || ''),
            }));

        if (favRows.length) {
            csv += `\n\nFAVORITOS\n${Admin.toCsv(favHeaders, favRows).replace(/^\uFEFF/, '')}`;
        }

        return csv;
    },

    exportSelectedCsvs: async () => {
        const groupId = window.Groups?.currentGroupId;
        const tournamentId = window.Groups?.currentTournamentId;
        if (!groupId || !tournamentId) {
            window.toast?.warning('Selecciona una porra primero.');
            return;
        }

        const wantEquipos = !!document.getElementById('export-equipos')?.checked;
        const wantPartidos = !!document.getElementById('export-partidos')?.checked;
        const wantUsuarios = !!document.getElementById('export-usuarios')?.checked;
        if (!wantEquipos && !wantPartidos && !wantUsuarios) {
            window.toast?.warning('Selecciona al menos un fichero.');
            return;
        }

        window.showLoading?.();
        try {
            let groupName = `porra_${groupId}`;
            try {
                const { data: g } = await window.supabaseClient
                    .from('groups')
                    .select('nombre')
                    .eq('id', groupId)
                    .maybeSingle();
                if (g?.nombre) groupName = g.nombre;
            } catch (_) { /* ignore */ }
            const slug = Admin.slugify(groupName);

            const downloads = [];

            if (wantEquipos) {
                const [teams, groupValues] = await Promise.all([
                    window.apiClient.getTeams(tournamentId),
                    window.apiClient.getGroupTeamValues(groupId),
                ]);
                downloads.push({
                    name: `riesgol_${slug}_equipos.csv`,
                    csv: Admin.buildEquiposCsv(teams, groupValues),
                });
            }

            if (wantPartidos) {
                const matches = await window.apiClient.getMatches(tournamentId, groupId);
                downloads.push({
                    name: `riesgol_${slug}_partidos.csv`,
                    csv: Admin.buildPartidosCsv(matches),
                });
            }

            if (wantUsuarios) {
                const [members, bets, favRes, matches] = await Promise.all([
                    window.apiClient.getGroupMembers(groupId),
                    window.apiClient.getGroupBets(groupId),
                    window.supabaseClient
                        .from('favorite_selections')
                        .select('user_id, team_id, bombo, teams(id, nombre)')
                        .eq('group_id', groupId),
                    window.apiClient.getMatches(tournamentId, groupId),
                ]);
                if (favRes.error) console.warn('[Export] favorites:', favRes.error);
                downloads.push({
                    name: `riesgol_${slug}_usuarios.csv`,
                    csv: Admin.buildUsuariosCsv(members, bets, favRes.data || [], matches),
                });
            }

            for (let i = 0; i < downloads.length; i++) {
                Admin.downloadBlob(downloads[i].name, downloads[i].csv);
                if (i < downloads.length - 1) await Admin.sleep(350);
            }

            window.toast?.success(
                downloads.length === 1
                    ? 'CSV descargado'
                    : `${downloads.length} CSV descargados`
            );
        } catch (err) {
            console.error('[Export]', err);
            window.toast?.error('Error al exportar: ' + (err.message || 'revisa la consola'));
        } finally {
            window.hideLoading?.();
        }
    },

    switchAdminTab: (tabId) => {
        const root = document.getElementById('group-admin-view');
        if (!root || !tabId) return;

        root.querySelectorAll('.admin-tab').forEach((btn) => {
            const active = btn.getAttribute('data-admin-tab') === tabId;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
        });

        root.querySelectorAll('.admin-tab-panel').forEach((panel) => {
            const active = panel.getAttribute('data-admin-panel') === tabId;
            panel.classList.toggle('active', active);
            if (active) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        });
    },

    // Inicializar event listeners
    init: () => {
        document.getElementById('group-admin-view')?.addEventListener('click', (e) => {
            const tabBtn = e.target.closest?.('.admin-tab');
            if (!tabBtn) return;
            e.preventDefault();
            Admin.switchAdminTab(tabBtn.getAttribute('data-admin-tab'));
        });

        document.getElementById('special-prize-enabled')?.addEventListener('change', async (e) => {
            document.getElementById('special-position-group').style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                await Admin.populateSpecialPositionSelect();
            }
        });

        document.getElementById('special-position')?.addEventListener('change', async () => {
            await Admin.updateSpecialPositionHint();
        });

        document.getElementById('special-prize-form')?.addEventListener('submit', Admin.saveSpecialPrizeConfig);
        document.getElementById('tournament-status-form')?.addEventListener('submit', Admin.saveTournamentStatus);
        document.getElementById('team-values-form')?.addEventListener('submit', Admin.saveTeamValues);
        document.getElementById('scoring-rules-form')?.addEventListener('submit', Admin.saveScoringRulesConfig);
        document.getElementById('delete-group-btn')?.addEventListener('click', Admin.deleteCurrentGroup);
        document.getElementById('admin-export-btn')?.addEventListener('click', () => Admin.exportSelectedCsvs());
        document.getElementById('admin-export-options')?.addEventListener('change', () => Admin.updateExportButtonState());
        Admin.updateExportButtonState();

        document.getElementById('sync-matches-btn')?.addEventListener('click', async () => {
            const tournamentId = window.Groups?.currentTournamentId;
            if (!tournamentId) {
                window.toast?.warning('Selecciona una porra primero.');
                return;
            }
            window.showLoading?.();
            try {
                await Admin.syncMatchesForTournament(tournamentId);
                await Admin.loadTeamValuesEditor();
            } finally {
                window.hideLoading?.();
            }
        });

        document.querySelectorAll('#tournament-status-control .segmented-control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                Admin.setSegmentedControlValue(btn.dataset.value);
            });
        });
    }
};

window.Admin = Admin;

// js/admin.js
// Lógica para la administración de porras

const Admin = {
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
            document.getElementById('special-prize-enabled').checked = group.special_prize_enabled || false;
            document.getElementById('special-position').value = group.special_position || '';
            document.getElementById('special-position-group').style.display = group.special_prize_enabled ? 'block' : 'none';
        }
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
            document.getElementById('tournament-status').value = tournament.estado || 'draft';
        }
    },

    // Guardar configuración de premio especial
    saveSpecialPrizeConfig: async (e) => {
        e.preventDefault();
        
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        const enabled = document.getElementById('special-prize-enabled').checked;
        const position = enabled ? parseInt(document.getElementById('special-position').value) : null;

        if (enabled && (!position || position < 1)) {
            window.toast?.warning('Por favor ingresa una posición válida');
            return;
        }

        const success = await window.apiClient.updateSpecialPrize(groupId, enabled, position);
        if (success) {
            window.toast?.success('Configuración guardada');
        } else {
            window.toast?.error('Error al guardar configuración');
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
            // Salir del contexto de porra y volver a Mis Porras
            window.Groups?.returnToList();
            window.Groups?.loadUserGroups();
        } finally {
            window.hideLoading();
        }
    },

    BOMBO_OPTIONS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],

    buildBomboSelectOptions: (selected) => {
        const opts = ['<option value="">—</option>'];
        Admin.BOMBO_OPTIONS.forEach(letter => {
            const sel = selected === letter ? ' selected' : '';
            opts.push(`<option value="${letter}"${sel}>${letter}</option>`);
        });
        return opts.join('');
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

        await window.apiClient.ensureTeamsFromMatches(tournamentId);

        const teams = await window.apiClient.getTeams(tournamentId);
        const groupValues = await window.apiClient.getGroupTeamValues(groupId);
        const valuesByTeamId = {};
        (groupValues || []).forEach(gv => { valuesByTeamId[gv.team_id] = gv; });

        if (!teams || teams.length === 0) {
            container.innerHTML = `
                <p class="text-muted">
                    No hay equipos en el catálogo. Sincroniza los partidos del torneo primero
                    (Edge Function <code>sync-matches</code>).
                </p>
            `;
            return;
        }

        const displayName = (name) => {
            if (typeof window.translateTeamName === 'function') {
                return window.translateTeamName(name);
            }
            return name;
        };

        const rows = teams.map(team => {
            const cfg = valuesByTeamId[team.id];
            const valor = cfg?.valor != null ? Number(cfg.valor).toFixed(2) : '';
            const bombo = cfg?.bombo || '';
            return `
                <tr data-team-id="${team.id}">
                    <td>${displayName(team.nombre)}</td>
                    <td>
                        <input type="number" class="team-valor-input" step="0.01" min="0"
                               value="${valor}" placeholder="0.00"
                               style="width: 100%; max-width: 120px;">
                    </td>
                    <td>
                        <select class="team-bombo-select" style="width: 100%; max-width: 80px;">
                            ${Admin.buildBomboSelectOptions(bombo)}
                        </select>
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table class="premium-table">
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Valor</th>
                            <th>Bombo</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p style="color: var(--text-muted); margin-top: 0.75rem; font-size: 0.9rem;">
                ${teams.length} equipos · Los cambios recalculan puntuaciones Pichichi al instante.
            </p>
        `;
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

        document.querySelectorAll('#team-values-editor tbody tr[data-team-id]').forEach((tr, idx) => {
            const teamId = parseInt(tr.getAttribute('data-team-id'), 10);
            const valorRaw = tr.querySelector('.team-valor-input')?.value?.trim();
            const bombo = tr.querySelector('.team-bombo-select')?.value?.trim().toUpperCase() || '';

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
        
        if (!groupId || !currentUser || !adminLink) {
            adminLink.style.display = 'none';
            return;
        }

        const isAdmin = await Admin.isAdmin(groupId, currentUser.id);
        adminLink.style.display = isAdmin ? 'block' : 'none';
    },

    // Inicializar event listeners
    init: () => {
        // Checkbox de premio especial
        document.getElementById('special-prize-enabled')?.addEventListener('change', (e) => {
            document.getElementById('special-position-group').style.display = e.target.checked ? 'block' : 'none';
        });

        // Formulario de premio especial
        document.getElementById('special-prize-form')?.addEventListener('submit', Admin.saveSpecialPrizeConfig);

        // Formulario de estado del torneo
        document.getElementById('tournament-status-form')?.addEventListener('submit', Admin.saveTournamentStatus);

        // Formulario de valores por equipo (Puntos FIFA / Coeficientes)
        document.getElementById('team-values-form')?.addEventListener('submit', Admin.saveTeamValues);

        // Eliminar porra (zona peligrosa)
        document.getElementById('delete-group-btn')?.addEventListener('click', Admin.deleteCurrentGroup);
    }
};

// Exponer al ámbito global
window.Admin = Admin;

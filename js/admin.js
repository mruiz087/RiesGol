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
                                    ${member.role === 'admin' 
                                        ? `<button class="btn-secondary btn-sm" onclick="Admin.demoteMember(${member.user_id})">Degradar</button>`
                                        : `<button class="btn-primary btn-sm" onclick="Admin.promoteMember(${member.user_id})">Promover</button>`
                                    }
                                </td>
                            ` : isCurrentUserAdmin ? '<td></td>' : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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

    // Promover miembro a admin
    promoteMember: async (userId) => {
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        if (!confirm('¿Estás seguro de promover a este usuario a administrador?')) return;

        const success = await window.apiClient.promoteToAdmin(groupId, userId);
        if (success) {
            alert('Usuario promovido a administrador');
            Admin.loadGroupMembers();
        } else {
            alert('Error al promover usuario');
        }
    },

    // Degradar admin a miembro
    demoteMember: async (userId) => {
        const groupId = window.Groups?.currentGroupId;
        if (!groupId) return;

        if (!confirm('¿Estás seguro de degradar a este usuario a miembro?')) return;

        const success = await window.apiClient.demoteFromAdmin(groupId, userId);
        if (success) {
            alert('Usuario degradado a miembro');
            Admin.loadGroupMembers();
        } else {
            alert('Error al degradar usuario. Puede que sea el último administrador.');
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
            alert('Por favor ingresa una posición válida');
            return;
        }

        const success = await window.apiClient.updateSpecialPrize(groupId, enabled, position);
        if (success) {
            alert('Configuración guardada');
        } else {
            alert('Error al guardar configuración');
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
            alert('Estado del torneo actualizado');
        } else {
            alert('Error al actualizar estado del torneo');
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
    }
};

// Exponer al ámbito global
window.Admin = Admin;

// js/groups.js
// Lógica para la gestión de porras (groups)

const Groups = {
    currentGroupId: null,
    currentTournamentId: null,
    selectedTournamentId: null,

    /** true / false / null (desconocido). Se invalida al cambiar de porra. */
    currentUserHasPichichi: null,

    userHasPichichi: async (userId = null, groupId = null) => {
        const uid = userId || window.currentUser?.id || window.getCurrentUser?.()?.id;
        const gid = groupId ?? Groups.currentGroupId;
        if (!uid || !gid || !window.supabaseClient) return false;

        if (
            Groups.currentUserHasPichichi != null
            && String(gid) === String(Groups.currentGroupId)
            && String(uid) === String(window.currentUser?.id || window.getCurrentUser?.()?.id)
        ) {
            return Groups.currentUserHasPichichi;
        }

        const { data, error } = await window.supabaseClient
            .from('favorite_selections')
            .select('id')
            .eq('user_id', uid)
            .eq('group_id', gid)
            .limit(1);

        if (error) {
            console.error('Error comprobando pichichi:', error);
            return false;
        }

        const has = !!(data && data.length > 0);
        if (String(gid) === String(Groups.currentGroupId)) {
            Groups.currentUserHasPichichi = has;
        }
        return has;
    },

    getTournamentStatusLabel: (estado) => {
        if (estado === 'finished') return { text: 'Finalizada', className: 'finished' };
        if (estado === 'draft') return { text: 'Borrador', className: 'draft' };
        return { text: 'Activa', className: 'active' };
    },

    getTournamentPickerStatus: (estado) => {
        const map = {
            draft: { text: 'Borrador', className: 'draft' },
            active: { text: 'Activo', className: 'active' },
            finished: { text: 'Finalizado', className: 'finished' },
            archived: { text: 'Archivado', className: 'finished' }
        };
        return map[estado] || map.draft;
    },

    formatTournamentDateRange: (fechaInicio, fechaFin) => {
        const fmt = (iso) => {
            if (!iso) return null;
            try {
                return new Date(iso).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            } catch (_) {
                return null;
            }
        };
        const start = fmt(fechaInicio);
        const end = fmt(fechaFin);
        if (start && end) return `${start} – ${end}`;
        if (start) return `Desde ${start}`;
        if (end) return `Hasta ${end}`;
        return 'Fechas por confirmar';
    },

    renderTournamentPicker: (tournaments, selectedId = null) => {
        const picker = document.getElementById('tournament-picker');
        const hidden = document.getElementById('tournament-id');
        if (!picker) return;

        if (!tournaments || tournaments.length === 0) {
            picker.innerHTML = `
                <p class="text-muted tournament-picker-empty">
                    No hay torneos disponibles. Comprueba la API key y despliega <code>sync-tournaments</code>.
                </p>
            `;
            if (hidden) hidden.value = '';
            Groups.selectedTournamentId = null;
            return;
        }

        picker.innerHTML = tournaments.map(t => {
            const status = Groups.getTournamentPickerStatus(t.estado);
            const dates = Groups.formatTournamentDateRange(t.fecha_inicio, t.fecha_fin);
            const selected = selectedId === t.id ? ' selected' : '';
            const tipoLabel = t.tipo === 'EURO' ? 'Eurocopa' : 'Mundial';
            return `
                <button type="button" class="tournament-card${selected}"
                        data-tournament-id="${t.id}"
                        aria-pressed="${selectedId === t.id}">
                    <div class="tournament-card-top">
                        <span class="tournament-card-badge ${status.className}">${status.text}</span>
                        <span class="tournament-card-type">${tipoLabel}</span>
                    </div>
                    <h4 class="tournament-card-name">${t.nombre}</h4>
                    <p class="tournament-card-year">${t.anio}</p>
                    <p class="tournament-card-dates">${dates}</p>
                </button>
            `;
        }).join('');

        picker.querySelectorAll('.tournament-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.tournamentId, 10);
                Groups.selectTournamentCard(id);
            });
        });

        if (selectedId) {
            Groups.selectTournamentCard(selectedId, false);
        }
    },

    selectTournamentCard: (tournamentId, updateDom = true) => {
        Groups.selectedTournamentId = tournamentId;
        const hidden = document.getElementById('tournament-id');
        if (hidden) hidden.value = String(tournamentId);

        if (!updateDom) return;

        document.querySelectorAll('.tournament-card').forEach(card => {
            const id = parseInt(card.dataset.tournamentId, 10);
            const isSelected = id === tournamentId;
            card.classList.toggle('selected', isSelected);
            card.setAttribute('aria-pressed', String(isSelected));
        });
    },

    resetTournamentPicker: () => {
        Groups.selectedTournamentId = null;
        const hidden = document.getElementById('tournament-id');
        if (hidden) hidden.value = '';
    },

    // Cargar y sincronizar torneos disponibles (tarjetas)
    loadTournaments: async () => {
        const picker = document.getElementById('tournament-picker');
        if (picker) {
            picker.innerHTML = '<p class="text-muted tournament-picker-loading">Sincronizando torneos…</p>';
        }

        const { tournaments, error } = await window.apiClient.syncAvailableTournaments();

        if (error) {
            window.toast?.warning(`Sync torneos: ${error}. Mostrando datos en caché.`);
            const cached = await window.apiClient.getTournaments();
            Groups.renderTournamentPicker(cached, Groups.selectedTournamentId);
            return;
        }

        Groups.renderTournamentPicker(tournaments, Groups.selectedTournamentId);
    },

    // Cargar las porras del usuario
    loadUserGroups: async () => {
        const user = window.currentUser;
        if (!user) return;

        const groups = await window.apiClient.getUserGroups(user.id);
        const container = document.getElementById('groups-container');

        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No tienes porras todavía.</p>
                    <p>Crea una porra nueva o únete con un código.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = groups.map(member => {
            const group = member.groups;
            const tournament = group.tournaments;
            const roleLabel = member.role === 'admin' ? 'Admin' : 'Miembro';
            const roleClass = member.role === 'admin' ? 'admin' : 'member';
            const status = Groups.getTournamentStatusLabel(tournament.estado);

            return `
                <div class="group-card" data-group-id="${group.id}" data-tournament-id="${tournament.id}">
                    <div class="group-card-header">
                        <div>
                            <h3 class="group-card-title">${group.nombre}</h3>
                            <p class="group-card-tournament">${tournament.nombre}</p>
                        </div>
                        <span class="group-card-code">${group.codigo}</span>
                    </div>
                    <span class="group-card-role ${roleClass}">${roleLabel}</span>
                    <p class="group-card-members">Código: ${group.codigo}</p>
                    <span class="group-card-status ${status.className}">${status.text}</span>
                </div>
            `;
        }).join('');

        // Añadir event listeners para las tarjetas
        container.querySelectorAll('.group-card').forEach(card => {
            card.addEventListener('click', () => {
                const groupId = parseInt(card.dataset.groupId);
                const tournamentId = parseInt(card.dataset.tournamentId);
                Groups.selectGroup(groupId, tournamentId);
            });
        });
    },

    // Seleccionar una porra: pichichi primero si aún no está guardado
    selectGroup: async (groupId, tournamentId) => {
        Groups.currentGroupId = groupId;
        Groups.currentTournamentId = tournamentId;
        Groups.currentUserHasPichichi = null;

        localStorage.setItem('currentGroupId', groupId);
        localStorage.setItem('currentTournamentId', tournamentId);

        if (window.Admin) {
            window.Admin.updateAdminLinkVisibility();
        }

        const hasPichichi = await Groups.userHasPichichi();
        window.navigateTo(hasPichichi ? 'dashboard-view' : 'pichichi-view');
    },

    // Volver al listado de porras (salir del contexto de porra activa)
    returnToList: () => {
        Groups.currentGroupId = null;
        Groups.currentTournamentId = null;
        Groups.currentUserHasPichichi = null;
        localStorage.removeItem('currentGroupId');
        localStorage.removeItem('currentTournamentId');

        window.navigateTo('my-groups-view');
    },

    // Crear una nueva porra
    createGroup: async (nombre, tournamentId) => {
        console.log('createGroup - Iniciando', { nombre, tournamentId });
        const user = window.currentUser;
        if (!user) {
            console.error('createGroup - No hay usuario');
            window.toast?.error('Debes iniciar sesión para crear una porra');
            return;
        }

        console.log('createGroup - Llamando a apiClient.createGroup');
        const result = await window.apiClient.createGroup(nombre, tournamentId, user.id);
        console.log('createGroup - Resultado:', result);
        
        if (result?.group) {
            window.toast?.success(`Porra "${nombre}" creada con éxito. Código: ${result.group.codigo}`);
            window.navigateTo('my-groups-view');
            Groups.loadUserGroups();
        } else {
            window.toast?.error(result?.error || 'Error al crear la porra');
        }
    },

    // Unirse a una porra por código
    joinGroup: async (codigo) => {
        console.log('joinGroup - Iniciando', { codigo });
        const user = window.currentUser;
        if (!user) {
            console.error('joinGroup - No hay usuario');
            window.toast?.error('Debes iniciar sesión para unirte a una porra');
            return;
        }

        console.log('joinGroup - Llamando a apiClient.joinGroupByCode');
        const result = await window.apiClient.joinGroupByCode(codigo.toUpperCase(), user.id);
        console.log('joinGroup - Resultado:', result);
        
        if (result.success) {
            window.toast?.success(`Te has unido a la porra "${result.group.nombre}"`);
            window.navigateTo('my-groups-view');
            Groups.loadUserGroups();
        } else {
            window.toast?.error(result.error || 'Error al unirse a la porra');
        }
    },

    // Inicializar event listeners
    init: () => {
        // Botón crear porra
        document.getElementById('create-group-btn')?.addEventListener('click', () => {
            Groups.loadTournaments();
            window.navigateTo('create-group-view');
        });

        // Botón unirse a porra
        document.getElementById('join-group-btn')?.addEventListener('click', () => {
            window.navigateTo('join-group-view');
        });

        // Formulario crear porra
        document.getElementById('create-group-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('group-name').value;
            const tournamentId = parseInt(document.getElementById('tournament-id').value, 10);
            
            if (!nombre || !tournamentId) {
                window.toast?.warning('Selecciona un torneo y escribe un nombre para la porra');
                return;
            }
            
            await Groups.createGroup(nombre, tournamentId);
        });

        document.getElementById('refresh-tournaments-btn')?.addEventListener('click', () => {
            Groups.loadTournaments();
        });

        // Cancelar crear porra
        document.getElementById('cancel-create-group')?.addEventListener('click', () => {
            document.getElementById('create-group-form').reset();
            Groups.resetTournamentPicker();
            document.getElementById('tournament-picker')?.querySelectorAll('.tournament-card')
                .forEach(c => c.classList.remove('selected'));
            window.navigateTo('my-groups-view');
        });

        // Formulario unirse a porra
        document.getElementById('join-group-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('join-code').value;
            
            if (!codigo || codigo.length !== 6) {
                window.toast?.warning('El código debe tener 6 caracteres');
                return;
            }
            
            await Groups.joinGroup(codigo);
        });

        // Cancelar unirse a porra
        document.getElementById('cancel-join-group')?.addEventListener('click', () => {
            document.getElementById('join-group-form').reset();
            window.navigateTo('my-groups-view');
        });

        // Recuperar grupo seleccionado del localStorage
        const savedGroupId = localStorage.getItem('currentGroupId');
        const savedTournamentId = localStorage.getItem('currentTournamentId');
        if (savedGroupId && savedTournamentId) {
            Groups.currentGroupId = parseInt(savedGroupId);
            Groups.currentTournamentId = parseInt(savedTournamentId);
        }
    }
};

// Exponer al ámbito global
window.Groups = Groups;

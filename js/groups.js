// js/groups.js
// Lógica para la gestión de porras (groups)

const Groups = {
    currentGroupId: null,
    currentTournamentId: null,

    getTournamentStatusLabel: (estado) => {
        if (estado === 'finished') return { text: 'Finalizada', className: 'finished' };
        return { text: 'Activa', className: 'active' };
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

    // Seleccionar una porra y navegar al dashboard
    selectGroup: (groupId, tournamentId) => {
        Groups.currentGroupId = groupId;
        Groups.currentTournamentId = tournamentId;
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('currentGroupId', groupId);
        localStorage.setItem('currentTournamentId', tournamentId);
        
        // Actualizar visibilidad del enlace de admin
        if (window.Admin) {
            window.Admin.updateAdminLinkVisibility();
        }
        
        // Navegar al dashboard (entrar en la porra)
        window.navigateTo('dashboard-view');
    },

    // Volver al listado de porras (salir del contexto de porra activa)
    returnToList: () => {
        Groups.currentGroupId = null;
        Groups.currentTournamentId = null;
        localStorage.removeItem('currentGroupId');
        localStorage.removeItem('currentTournamentId');

        window.navigateTo('my-groups-view');
    },

    // Cargar torneos disponibles en el select
    loadTournaments: async () => {
        const tournaments = await window.apiClient.getTournaments();
        const select = document.getElementById('tournament-select');
        
        if (!tournaments || tournaments.length === 0) {
            select.innerHTML = '<option value="">No hay torneos disponibles</option>';
            return;
        }

        select.innerHTML = '<option value="">Selecciona un torneo...</option>' +
            tournaments.map(t => `<option value="${t.id}">${t.nombre} (${t.anio})</option>`).join('');
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
            const tournamentId = parseInt(document.getElementById('tournament-select').value);
            
            if (!nombre || !tournamentId) {
                window.toast?.warning('Por favor completa todos los campos');
                return;
            }
            
            await Groups.createGroup(nombre, tournamentId);
        });

        // Cancelar crear porra
        document.getElementById('cancel-create-group')?.addEventListener('click', () => {
            document.getElementById('create-group-form').reset();
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

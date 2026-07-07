// js/groups.js
// Lógica para la gestión de porras (groups)

const Groups = {
    currentGroupId: null,
    currentTournamentId: null,
    currentFilter: 'all', // 'all', 'active', 'finished'

    // Cargar las porras del usuario
    loadUserGroups: async (filter = 'all') => {
        const user = window.currentUser;
        if (!user) return;

        Groups.currentFilter = filter;
        const groups = await window.apiClient.getUserGroups(user.id);
        const container = document.getElementById('groups-container');

        // Filtrar por estado del torneo
        let filteredGroups = groups;
        if (filter === 'active') {
            filteredGroups = groups.filter(member => 
                member.groups.tournaments.estado === 'active' || 
                member.groups.tournaments.estado === 'draft'
            );
        } else if (filter === 'finished') {
            filteredGroups = groups.filter(member => 
                member.groups.tournaments.estado === 'finished'
            );
        }
        
        if (!filteredGroups || filteredGroups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No tienes porras con este filtro.</p>
                    <p>Prueba con otro filtro o crea una porra nueva.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredGroups.map(member => {
            const group = member.groups;
            const tournament = group.tournaments;
            const roleLabel = member.role === 'admin' ? 'Admin' : 'Miembro';
            const roleClass = member.role === 'admin' ? 'admin' : 'member';
            
            return `
                <div class="group-card" data-group-id="${group.id}" data-tournament-id="${tournament.id}">
                    <div class="group-card-status ${tournament.estado}"></div>
                    <div class="group-card-header">
                        <div>
                            <h3 class="group-card-title">${group.nombre}</h3>
                            <p class="group-card-tournament">${tournament.nombre}</p>
                        </div>
                        <span class="group-card-code">${group.codigo}</span>
                    </div>
                    <span class="group-card-role ${roleClass}">${roleLabel}</span>
                    <p class="group-card-members">Código: ${group.codigo}</p>
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
        
        // Navegar al dashboard
        window.app.navigateTo('dashboard-view');
        
        // Recargar datos del dashboard con el grupo seleccionado
        window.app.loadDashboard();
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
        const user = window.currentUser;
        if (!user) {
            alert('Debes iniciar sesión para crear una porra');
            return;
        }

        const group = await window.apiClient.createGroup(nombre, tournamentId, user.id);
        
        if (group) {
            alert(`Porra "${nombre}" creada con éxito. Código: ${group.codigo}`);
            window.app.navigateTo('my-groups-view');
            Groups.loadUserGroups();
        } else {
            alert('Error al crear la porra');
        }
    },

    // Unirse a una porra por código
    joinGroup: async (codigo) => {
        const user = window.currentUser;
        if (!user) {
            alert('Debes iniciar sesión para unirte a una porra');
            return;
        }

        const result = await window.apiClient.joinGroupByCode(codigo.toUpperCase(), user.id);
        
        if (result.success) {
            alert(`Te has unido a la porra "${result.group.nombre}"`);
            window.app.navigateTo('my-groups-view');
            Groups.loadUserGroups();
        } else {
            alert(result.error || 'Error al unirse a la porra');
        }
    },

    // Inicializar event listeners
    init: () => {
        // Botón crear porra
        document.getElementById('create-group-btn')?.addEventListener('click', () => {
            Groups.loadTournaments();
            window.app.navigateTo('create-group-view');
        });

        // Botón unirse a porra
        document.getElementById('join-group-btn')?.addEventListener('click', () => {
            window.app.navigateTo('join-group-view');
        });

        // Formulario crear porra
        document.getElementById('create-group-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('group-name').value;
            const tournamentId = parseInt(document.getElementById('tournament-select').value);
            
            if (!nombre || !tournamentId) {
                alert('Por favor completa todos los campos');
                return;
            }
            
            await Groups.createGroup(nombre, tournamentId);
        });

        // Cancelar crear porra
        document.getElementById('cancel-create-group')?.addEventListener('click', () => {
            document.getElementById('create-group-form').reset();
            window.app.navigateTo('my-groups-view');
        });

        // Filtros de porras
        document.querySelectorAll('.filter-buttons button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                
                // Actualizar clases activas
                document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Recargar porras con el filtro
                Groups.loadUserGroups(filter);
            });
        });

        // Formulario unirse a porra
        document.getElementById('join-group-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('join-code').value;
            
            if (!codigo || codigo.length !== 6) {
                alert('El código debe tener 6 caracteres');
                return;
            }
            
            await Groups.joinGroup(codigo);
        });

        // Cancelar unirse a porra
        document.getElementById('cancel-join-group')?.addEventListener('click', () => {
            document.getElementById('join-group-form').reset();
            window.app.navigateTo('my-groups-view');
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

// js/pichichi.js
// Lógica para elegir 1 equipo de CADA GRUPO como Pichichi, cuyo valor de gol depende de sus puntos FIFA.

window.loadPichichiData = async function() {
    window.showLoading();
    try {
        const user = window.getCurrentUser();
        const groupId = window.Groups?.currentGroupId;
        
        if (!user || !window.supabaseClient) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center" style="grid-column:1/-1;">Debes iniciar sesión para elegir tu Pichichi.</p>';
            return;
        }

        if (!groupId) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center" style="grid-column:1/-1;">Selecciona una porra primero.</p>';
            return;
        }

        // Obtener equipos (ordenados por grupo y puntos FIFA)
        const teams = await window.apiClient.getTeams();
        if (!teams || teams.length === 0) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center" style="grid-column:1/-1;">No hay equipos cargados aún.</p>';
            return;
        }

        const maxFifaPoints = Math.max(...teams.map(t => t.puntos_fifa));

        // Obtener selecciones previas del usuario para este grupo
        const { data: userSelections } = await window.supabaseClient
            .from('favorite_selections')
            .select('*, teams(nombre, puntos_fifa)')
            .eq('user_id', user.id)
            .eq('group_id', groupId);
            
        // ¿Ya tiene selecciones guardadas? → bloquear
        const isLocked = userSelections && userSelections.length > 0;

        // Agrupar equipos por grupo (A, B, C...)
        const grupos = {};
        teams.forEach(team => {
            if (!grupos[team.grupo]) grupos[team.grupo] = [];
            grupos[team.grupo].push(team);
        });

        const container = document.getElementById('bombos-container');
        container.innerHTML = '';
        
        // Cabecera explicativa
        const header = document.createElement('div');
        header.style.gridColumn = '1 / -1';
        header.innerHTML = `
            <p style="text-align:center; color:var(--text-muted); font-size:0.95rem; margin-bottom:1rem;">
                El equipo más favorito del torneo tiene <strong>${maxFifaPoints} puntos FIFA</strong>. 
                El valor base del gol se calcula dividiendo estos puntos entre los puntos del equipo elegido. 
                Debes elegir <strong>UN EQUIPO DE CADA GRUPO</strong>. <br>Si el equipo es eliminado, dejará de marcar goles.
            </p>
            ${isLocked ? '<p style="text-align:center; color:var(--warning); font-weight:600; margin-bottom:1rem;">🔒 Tus selecciones ya están guardadas y no se pueden modificar.</p>' : ''}
        `;
        container.appendChild(header);

        // Tabla de valores de gol (todos los equipos ordenados por puntos FIFA)
        const goalValueTable = document.createElement('div');
        goalValueTable.style.gridColumn = '1 / -1';
        goalValueTable.style.marginTop = '2rem';
        goalValueTable.style.marginBottom = '2rem';
        
        const teamsSorted = [...teams].sort((a, b) => b.puntos_fifa - a.puntos_fifa);
        let tableRows = teamsSorted.map(team => {
            const goalValue = (maxFifaPoints / team.puntos_fifa).toFixed(2);
            return `
                <tr>
                    <td>${team.nombre}</td>
                    <td style="text-align:center;">${team.puntos_fifa}</td>
                    <td style="text-align:center; font-weight:bold; color:var(--primary);">${goalValue} pts</td>
                </tr>
            `;
        }).join('');

        goalValueTable.innerHTML = `
            <h3 style="text-align:center; margin-bottom:1rem; color:var(--text-muted);">Tabla de Valores de Gol</h3>
            <div style="overflow-x:auto;">
                <table class="goal-value-table">
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th style="text-align:center;">Pts FIFA</th>
                            <th style="text-align:center;">Valor Gol</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

        // Crear contenedor para las tarjetas de grupos con grid responsive
        const groupsGrid = document.createElement('div');
        groupsGrid.style.display = 'grid';
        groupsGrid.style.gridTemplateColumns = '1fr';
        groupsGrid.style.gap = '1.5rem';
        groupsGrid.style.justifyContent = 'center';
        container.appendChild(groupsGrid);

        Object.keys(grupos).sort().forEach(grupoNombre => {
            const currentSelection = (userSelections || []).find(s => s.grupo === grupoNombre);
            
            const card = document.createElement('div');
            card.className = 'bombo-card glass-panel';

            if (isLocked) {
                // --- MODO BLOQUEADO: mostrar selección como texto ---
                const selectedTeam = currentSelection 
                    ? teams.find(t => t.id === currentSelection.equipo_id)
                    : null;
                const baseGoalValue = selectedTeam 
                    ? (maxFifaPoints / selectedTeam.puntos_fifa).toFixed(2) 
                    : 'N/A';

                card.innerHTML = `
                    <h3>Grupo ${grupoNombre}</h3>
                    <div style="margin-top:1rem; padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                        ${selectedTeam 
                            ? `<strong style="color:var(--primary);">${selectedTeam.nombre}</strong>
                               <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">
                                   ${selectedTeam.puntos_fifa} pts FIFA · Valor gol: <strong>${baseGoalValue} pts</strong>
                               </div>`
                            : `<span style="color:var(--text-muted);">Sin selección</span>`
                        }
                    </div>
                `;
            } else {
                // --- MODO EDICIÓN: mostrar botones seleccionables ---
                let buttonsHtml = '';
                grupos[grupoNombre].forEach(team => {
                    const isSelected = currentSelection && currentSelection.equipo_id === team.id;
                    const baseGoalValue = (maxFifaPoints / team.puntos_fifa).toFixed(2);
                    const selectedClass = isSelected ? 'selected' : '';
                    
                    buttonsHtml += `
                        <button class="team-option-btn ${selectedClass}" 
                                data-team-id="${team.id}" 
                                data-grupo="${grupoNombre}"
                                data-value="${baseGoalValue}"
                                data-team-name="${team.nombre}">
                            <div class="team-option-name">${team.nombre}</div>
                            <div class="team-option-info">${team.puntos_fifa} pts FIFA</div>
                            <div class="team-option-value">Valor: ${baseGoalValue} pts</div>
                        </button>
                    `;
                });

                card.innerHTML = `
                    <h3>Grupo ${grupoNombre}</h3>
                    <div class="team-options-container" data-grupo="${grupoNombre}">
                        ${buttonsHtml}
                    </div>
                    <div class="pichichi-preview" style="margin-top:1rem; text-align:center; font-size:0.95rem; color:var(--primary); min-height: 20px;"></div>
                `;
            }
            groupsGrid.appendChild(card);
        });

        container.appendChild(goalValueTable);

        // Botón de guardar: solo visible si NO está bloqueado
        let saveBtn = document.getElementById('save-pichichi-btn');
        if (saveBtn) {
            saveBtn.style.display = isLocked ? 'none' : 'block';
            if (!isLocked) saveBtn.onclick = savePichichiSelections;
        }

        if (!isLocked) {
            // Event listeners para los botones de selección
            const optionBtns = document.querySelectorAll('.team-option-btn');
            optionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const grupo = btn.getAttribute('data-grupo');
                    const container = btn.closest('.team-options-container');
                    
                    // Deseleccionar todos los botones del mismo grupo
                    container.querySelectorAll('.team-option-btn').forEach(b => b.classList.remove('selected'));
                    
                    // Seleccionar el botón clickeado
                    btn.classList.add('selected');
                    
                    // Actualizar preview
                    const preview = container.nextElementSibling;
                    const val = btn.getAttribute('data-value');
                    const teamName = btn.getAttribute('data-team-name');
                    preview.innerHTML = `Seleccionado: <strong>${teamName}</strong> · Valor base gol: <strong>${val} pts</strong>`;
                });
            });
            
            // Inicializar previews para selecciones ya hechas
            document.querySelectorAll('.team-option-btn.selected').forEach(btn => {
                const container = btn.closest('.team-options-container');
                const preview = container.nextElementSibling;
                const val = btn.getAttribute('data-value');
                const teamName = btn.getAttribute('data-team-name');
                preview.innerHTML = `Seleccionado: <strong>${teamName}</strong> · Valor base gol: <strong>${val} pts</strong>`;
            });
        }

    } catch (error) {
        console.error("Error cargando Pichichi", error);
    } finally {
        window.hideLoading();
    }
};

async function savePichichiSelections() {
    const user = window.getCurrentUser();
    const groupId = window.Groups?.currentGroupId;
    
    if (!user) return;
    if (!groupId) {
        alert("Debes seleccionar una porra primero.");
        return;
    }

    const containers = document.querySelectorAll('.team-options-container');
    const upsertData = [];
    
    let allSelected = true;
    containers.forEach(container => {
        const selectedBtn = container.querySelector('.team-option-btn.selected');
        const bombo = container.getAttribute('data-grupo');
        
        if (selectedBtn) {
            const teamId = selectedBtn.getAttribute('data-team-id');
            upsertData.push({
                user_id: user.id,
                group_id: groupId,
                equipo_id: parseInt(teamId),
                bombo: bombo,
                fecha_seleccion: new Date().toISOString()
            });
        } else {
            allSelected = false;
        }
    });

    if (!allSelected) {
        alert("Por favor, asegúrate de elegir un equipo por CADA grupo.");
        return;
    }

    window.showLoading();
    try {
        const { error } = await window.supabaseClient
            .from('favorite_selections')
            .upsert(upsertData, { onConflict: 'group_id,user_id,bombo' });

        if (error) throw error;

        alert("Equipos Pichichi guardados con éxito. ¡Ya no podrás modificar tu elección!");
        // Recargar la vista para que quede bloqueada
        window.loadPichichiData();

    } catch (error) {
        console.error("Error guardando pichichi:", error);
        alert("Error al guardar. Revisa tu conexión.");
    } finally {
        window.hideLoading();
    }
}

// js/pichichi.js
// Lógica para elegir 1 equipo de CADA BOMBO como Pichichi, cuyo valor de gol depende del coeficiente configurado en la porra.

function displayTeamName(name) {
    if (typeof window.translateTeamName === 'function') {
        return window.translateTeamName(name);
    }
    return name;
}

function isConfiguredTeamValue(gv) {
    if (!gv) return false;
    const valor = Number(gv.valor);
    const bombo = String(gv.bombo || '').trim();
    return Number.isFinite(valor) && valor > 0 && /^[A-Z]$/i.test(bombo);
}

/** La porra está lista cuando todos los equipos del catálogo tienen valor y bombo. */
function isPichichiConfigComplete(teamsCatalog, groupValues) {
    if (!teamsCatalog?.length || !groupValues?.length) return false;
    const byTeamId = {};
    groupValues.forEach(gv => { byTeamId[gv.team_id] = gv; });
    return teamsCatalog.every(team => isConfiguredTeamValue(byTeamId[team.id]));
}

function setSaveButtonVisible(visible) {
    const saveBtn = document.getElementById('save-pichichi-btn');
    if (saveBtn) {
        saveBtn.style.display = visible ? 'block' : 'none';
    }
}

window.loadPichichiData = async function() {
    window.showLoading();
    setSaveButtonVisible(false);

    try {
        const user = window.getCurrentUser();
        const groupId = window.Groups?.currentGroupId;
        
        if (!user || !window.supabaseClient) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center pichichi-section-full">Debes iniciar sesión para elegir tu Pichichi.</p>';
            return;
        }

        if (!groupId) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center pichichi-section-full">Selecciona una porra primero.</p>';
            return;
        }

        const tournamentId = window.Groups?.currentTournamentId;

        await window.apiClient.ensureTeamsFromMatches(tournamentId);

        const teamsCatalog = await window.apiClient.getTeams(tournamentId);
        const groupValues = await window.apiClient.getGroupTeamValues(groupId);
        const configComplete = isPichichiConfigComplete(teamsCatalog, groupValues);

        const teams = window.apiClient.mergeTeamsWithGroupValues(teamsCatalog, groupValues)
            .filter(t => t.bombo && t.valor != null && t.valor > 0);

        if (!teamsCatalog?.length) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center pichichi-section-full">No hay equipos en el torneo. Sincroniza los partidos desde Admin o la API.</p>';
            return;
        }

        if (!teams.length) {
            document.getElementById('bombos-container').innerHTML = '<p class="text-center pichichi-section-full">No hay equipos configurados aún. Ve a <strong>Admin → Puntos FIFA / Coeficientes</strong> para asignar valor y bombo a cada equipo.</p>';
            return;
        }

        const maxFifaPoints = Math.max(...teams.map(t => t.valor));

        const { data: userSelections } = await window.supabaseClient
            .from('favorite_selections')
            .select('*, teams(nombre)')
            .eq('user_id', user.id)
            .eq('group_id', groupId);
            
        const isLocked = userSelections && userSelections.length > 0;

        const grupos = {};
        teams.forEach(team => {
            if (!grupos[team.bombo]) grupos[team.bombo] = [];
            grupos[team.bombo].push(team);
        });

        const container = document.getElementById('bombos-container');
        container.innerHTML = '';
        
        const header = document.createElement('div');
        header.className = 'pichichi-section-full';
        header.innerHTML = `
            <p style="text-align:center; color:var(--text-muted); font-size:0.95rem; margin-bottom:1rem;">
                El equipo más favorito de esta porra tiene <strong>${maxFifaPoints.toFixed(2)} puntos</strong>. 
                El valor base del gol se calcula dividiendo estos puntos entre los puntos del equipo elegido. 
                Debes elegir <strong>UN EQUIPO DE CADA BOMBO</strong>. <br>Si el equipo es eliminado, dejará de marcar goles.
            </p>
            ${!configComplete && !isLocked ? `
                <p class="pichichi-config-notice">
                    El administrador aún no ha configurado todos los equipos. Podrás guardar tu elección cuando estén listos.
                </p>
            ` : ''}
            ${isLocked ? '<p style="text-align:center; color:var(--warning); font-weight:600; margin-bottom:1rem;">🔒 Tus selecciones ya están guardadas y no se pueden modificar.</p>' : ''}
        `;
        container.appendChild(header);

        Object.keys(grupos).sort().forEach(grupoNombre => {
            const currentSelection = (userSelections || []).find(s => s.bombo === grupoNombre);
            
            const card = document.createElement('div');
            card.className = 'bombo-card glass-panel';

            if (isLocked) {
                const selectedTeam = currentSelection 
                    ? teams.find(t => t.id === window.PichichiScoring.getSelectionTeamId(currentSelection))
                    : null;
                const baseGoalValue = selectedTeam 
                    ? (maxFifaPoints / selectedTeam.valor).toFixed(2) 
                    : 'N/A';

                card.innerHTML = `
                    <div class="bombo-card__header">
                        <span class="bombo-badge">${grupoNombre}</span>
                        <h3>Bombo ${grupoNombre}</h3>
                    </div>
                    <div style="padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                        ${selectedTeam 
                            ? `<strong style="color:var(--primary);">${displayTeamName(selectedTeam.nombre)}</strong>
                               <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">
                                   ${Number(selectedTeam.valor).toFixed(2)} pts · Valor gol: <strong>${baseGoalValue} pts</strong>
                               </div>`
                            : `<span style="color:var(--text-muted);">Sin selección</span>`
                        }
                    </div>
                `;
            } else {
                let buttonsHtml = '';
                grupos[grupoNombre].forEach(team => {
                    const isSelected = currentSelection && window.PichichiScoring.getSelectionTeamId(currentSelection) === team.id;
                    const baseGoalValue = (maxFifaPoints / team.valor).toFixed(2);
                    const selectedClass = isSelected ? 'selected' : '';
                    
                    buttonsHtml += `
                        <button class="team-option-btn ${selectedClass}" 
                                data-team-id="${team.id}" 
                                data-grupo="${grupoNombre}"
                                data-value="${baseGoalValue}"
                                data-team-name="${displayTeamName(team.nombre)}">
                            <div class="team-option-name">${displayTeamName(team.nombre)}</div>
                            <div class="team-option-info">${Number(team.valor).toFixed(2)} pts</div>
                            <div class="team-option-value">Valor: ${baseGoalValue} pts</div>
                        </button>
                    `;
                });

                card.innerHTML = `
                    <div class="bombo-card__header">
                        <span class="bombo-badge">${grupoNombre}</span>
                        <h3>Bombo ${grupoNombre}</h3>
                    </div>
                    <div class="team-options-container" data-grupo="${grupoNombre}">
                        ${buttonsHtml}
                    </div>
                    <div class="pichichi-preview"></div>
                `;
            }
            container.appendChild(card);
        });

        const goalValueTable = document.createElement('div');
        goalValueTable.className = 'pichichi-section-full';
        goalValueTable.style.marginTop = '1rem';
        
        const teamsSorted = [...teams].sort((a, b) => b.valor - a.valor);
        const tableRows = teamsSorted.map(team => {
            const goalValue = (maxFifaPoints / team.valor).toFixed(2);
            return `
                <tr>
                    <td>${displayTeamName(team.nombre)}</td>
                    <td style="text-align:center;">${Number(team.valor).toFixed(2)}</td>
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
                            <th style="text-align:center;">Valor</th>
                            <th style="text-align:center;">Valor Gol</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
        container.appendChild(goalValueTable);

        const canSave = configComplete && !isLocked;
        setSaveButtonVisible(canSave);

        const saveBtn = document.getElementById('save-pichichi-btn');
        if (canSave && saveBtn) {
            saveBtn.onclick = savePichichiSelections;
        }

        if (!isLocked) {
            document.querySelectorAll('.team-option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const optionsContainer = btn.closest('.team-options-container');
                    optionsContainer.querySelectorAll('.team-option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    
                    const preview = optionsContainer.nextElementSibling;
                    const val = btn.getAttribute('data-value');
                    const teamName = btn.getAttribute('data-team-name');
                    preview.innerHTML = `Seleccionado: <strong>${teamName}</strong> · Valor gol: <strong>${val} pts</strong>`;
                });
            });
            
            document.querySelectorAll('.team-option-btn.selected').forEach(btn => {
                const optionsContainer = btn.closest('.team-options-container');
                const preview = optionsContainer.nextElementSibling;
                const val = btn.getAttribute('data-value');
                const teamName = btn.getAttribute('data-team-name');
                preview.innerHTML = `Seleccionado: <strong>${teamName}</strong> · Valor gol: <strong>${val} pts</strong>`;
            });
        }

    } catch (error) {
        console.error("Error cargando Pichichi", error);
        setSaveButtonVisible(false);
    } finally {
        window.hideLoading();
    }
};

async function savePichichiSelections() {
    const user = window.getCurrentUser();
    const groupId = window.Groups?.currentGroupId;
    
    if (!user) return;
    if (!groupId) {
        window.toast?.warning("Debes seleccionar una porra primero.");
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
        window.toast?.warning("Por favor, asegúrate de elegir un equipo por CADA bombo.");
        return;
    }

    window.showLoading();
    try {
        const { error } = await window.supabaseClient
            .from('favorite_selections')
            .upsert(upsertData, { onConflict: 'group_id,user_id,bombo' });

        if (error) throw error;

        window.toast?.success("Equipos Pichichi guardados con éxito. ¡Ya no podrás modificar tu elección!");
        window.loadPichichiData();

    } catch (error) {
        console.error("Error guardando pichichi:", error);
        window.toast?.error("Error al guardar. Revisa tu conexión.");
    } finally {
        window.hideLoading();
    }
}

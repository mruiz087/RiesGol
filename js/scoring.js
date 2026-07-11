// js/scoring.js
// Lógica para cargar y mostrar la clasificación y el podio (calculada dinámicamente por grupo)

window.loadRanking = async function() {
    window.showLoading();
    try {
        const groupId = window.Groups?.currentGroupId;
        
        if (!window.supabaseClient) return;
        if (!groupId) {
            document.getElementById('ranking-body').innerHTML = '<tr><td colspan="3" class="text-center">Selecciona una porra primero.</td></tr>';
            document.getElementById('pichichi-ranking-body').innerHTML = '<tr><td colspan="3" class="text-center">Selecciona una porra primero.</td></tr>';
            return;
        }

        // ─── Obtener miembros del grupo ──────────────────────────────
        const { data: members, error: membersError } = await window.supabaseClient
            .from('group_members')
            .select('user_id, users(name)')
            .eq('group_id', groupId);

        if (membersError) throw membersError;

        if (!members || members.length === 0) {
            document.getElementById('ranking-body').innerHTML = '<tr><td colspan="3" class="text-center">No hay miembros en esta porra.</td></tr>';
            document.getElementById('pichichi-ranking-body').innerHTML = '<tr><td colspan="3" class="text-center">No hay miembros en esta porra.</td></tr>';
            return;
        }

        // ─── Obtener partidos del torneo ──────────────────────────────
        const tournamentId = window.Groups?.currentTournamentId;
        const { data: matches } = await window.supabaseClient
            .from('matches')
            .select('id, equipo_local_id, equipo_visitante_id, equipo_local_nombre, equipo_visitante_nombre, goles_local, goles_visitante, fase, estado')
            .eq('tournament_id', tournamentId);

        // ─── Obtener apuestas del grupo ──────────────────────────────
        const { data: bets } = await window.supabaseClient
            .from('bets')
            .select('user_id, match_id, prediccion')
            .eq('group_id', groupId);

        // ─── Obtener selecciones Pichichi del grupo ───────────────────
        const { data: favoriteSelections, error: favError } = await window.supabaseClient
            .from('favorite_selections')
            .select('*, teams(id, nombre, puntos_fifa)')
            .eq('group_id', groupId);

        if (favError) console.error('Error cargando selecciones Pichichi:', favError);

        // ─── Obtener equipos para puntos FIFA ─────────────────────────
        const { data: teams } = await window.supabaseClient
            .from('teams')
            .select('id, nombre, puntos_fifa');

        const aliases = await window.PichichiScoring.loadTeamAliases();
        const { teamsFifaMap, teamsNameToId, aliasMap } = window.PichichiScoring.buildTeamMaps(teams, aliases);

        // ─── Obtener configuración de premio especial ─────────────────
        const { data: groupConfig } = await window.supabaseClient
            .from('groups')
            .select('special_prize_enabled, special_position')
            .eq('id', groupId)
            .single();

        const specialPrizeEnabled = groupConfig?.special_prize_enabled === true;
        const specialPosition = specialPrizeEnabled && groupConfig?.special_position > 0
            ? groupConfig.special_position
            : null;

        // ─── Calcular puntos por usuario ───────────────────────────────
        const userPoints = {};
        const userPichichiPoints = {};

        // Inicializar usuarios
        members.forEach(member => {
            userPoints[member.user_id] = {
                userId: member.user_id,
                name: member.users?.name || 'Anónimo',
                betPoints: 0,
                pichichiPoints: 0,
                totalPoints: 0,
                hasMissedBet: false
            };
            userPichichiPoints[member.user_id] = 0;
        });

        // Multiplicadores de fase
        const phaseMultipliers = {
            'GROUP_STAGE': 1,
            'LAST_32': 2,
            'LAST_16': 3,
            'ROUND_OF_16': 3,
            'QUARTER_FINALS': 4,
            'SEMI_FINALS': 5,
            'FINAL': 6
        };

        // ─── Calcular puntos de apuestas ───────────────────────────────
        if (matches && bets) {
            matches.forEach(match => {
                if (match.estado !== 'finalizado') return;
                
                const multiplier = phaseMultipliers[match.fase] || 1;
                
                // Determinar resultado real
                let resultado = 'X';
                if (match.goles_local > match.goles_visitante) resultado = '1';
                else if (match.goles_visitante > match.goles_local) resultado = '2';

                // Obtener apuestas para este partido
                const matchBets = bets.filter(b => b.match_id === match.id);
                const totalBets = matchBets.length;
                
                if (totalBets === 0) return;

                // Contar aciertos
                const correctBets = matchBets.filter(b => b.prediccion === resultado).length;
                const failedBets = totalBets - correctBets;

                // Asignar puntos: cada usuario obtiene puntos = usuarios que fallaron * multiplicador
                matchBets.forEach(bet => {
                    const userId = bet.user_id;
                    if (userPoints[userId]) {
                        if (bet.prediccion === resultado) {
                            userPoints[userId].betPoints += failedBets * multiplier;
                        } else {
                            userPoints[userId].hasMissedBet = true;
                        }
                    }
                });
            });

            // Marcar usuarios sin apuestas en partidos finalizados
            const finishedMatches = matches.filter(m => m.estado === 'finalizado');
            members.forEach(member => {
                const userId = member.user_id;
                finishedMatches.forEach(match => {
                    const hasBet = bets.some(b => b.user_id === userId && b.match_id === match.id);
                    if (!hasBet) {
                        userPoints[userId].hasMissedBet = true;
                    }
                });
            });
        }

        // ─── Calcular puntos Pichichi ───────────────────────────────────
        if (matches && favoriteSelections && teams && window.PichichiScoring) {
            const fifaValues = Object.values(teamsFifaMap);
            const maxFifaPoints = fifaValues.length > 0 ? Math.max(...fifaValues) : 1000;

            const selectionsByUser = {};
            favoriteSelections.forEach(selection => {
                const userId = selection.user_id;
                if (!selectionsByUser[userId]) selectionsByUser[userId] = [];
                selectionsByUser[userId].push(selection);
            });

            Object.entries(selectionsByUser).forEach(([userId, selections]) => {
                const { total } = window.PichichiScoring.calcUserPichichi(
                    selections, matches, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap
                );
                if (userPoints[userId]) {
                    userPoints[userId].pichichiPoints = total;
                }
            });
        }

        // ─── Calcular total y ordenar ───────────────────────────────────
        Object.keys(userPoints).forEach(userId => {
            userPoints[userId].totalPoints = userPoints[userId].betPoints + userPoints[userId].pichichiPoints;
        });

        const ranking = Object.values(userPoints).sort((a, b) => b.totalPoints - a.totalPoints);

        // ─── Renderizar Podio ───────────────────────────────────────────
        if (ranking[0]) {
            document.getElementById('podium-name-1').textContent = ranking[0].name;
            document.getElementById('podium-pts-1').textContent = `${ranking[0].totalPoints.toFixed(1)} pts`;
        }
        if (ranking[1]) {
            document.getElementById('podium-name-2').textContent = ranking[1].name;
            document.getElementById('podium-pts-2').textContent = `${ranking[1].totalPoints.toFixed(1)} pts`;
        }

        const lastPlace = ranking.length > 0 ? ranking[ranking.length - 1] : null;
        const pNameLast = document.getElementById('podium-name-last');
        if (lastPlace) {
            pNameLast.textContent = lastPlace.name;
        } else {
            pNameLast.textContent = '--';
        }

        const podiumStepSpecial = document.getElementById('podium-step-special');
        const pNameSpecial = document.getElementById('podium-name-13');
        const pPtsSpecial = document.getElementById('podium-pts-13');
        const pLabelSpecial = document.getElementById('podium-label-special');

        if (specialPosition && ranking[specialPosition - 1]) {
            const specialUser = ranking[specialPosition - 1];
            if (podiumStepSpecial) podiumStepSpecial.style.display = '';
            pNameSpecial.textContent = `${specialPosition}º: ${specialUser.name}`;
            pPtsSpecial.textContent = `${specialUser.totalPoints.toFixed(1)} pts`;
            if (pLabelSpecial) pLabelSpecial.textContent = `${specialPosition}º`;
        } else {
            if (podiumStepSpecial) podiumStepSpecial.style.display = 'none';
            pNameSpecial.textContent = '--';
            pPtsSpecial.textContent = '0 pts';
        }

        // ─── Renderizar Tabla General ───────────────────────────────────
        const tbody = document.getElementById('ranking-body');
        tbody.innerHTML = '';

        ranking.forEach((user, index) => {
            const pos = index + 1;
            const isFirst = pos === 1;
            const isSecond = pos === 2;
            const isSpecial = specialPosition && pos === specialPosition;
            const isLast = pos === ranking.length;

            let badgeHtml = '';
            if (isFirst) badgeHtml += '<span class="badge gold ml-2">🥇</span>';
            if (isSecond) badgeHtml += '<span class="badge silver ml-2">🥈</span>';
            if (isLast && ranking.length > 2) badgeHtml += '<span class="badge bronze ml-2">💀</span>';
            if (isSpecial) badgeHtml += '<span class="badge spooky ml-2">👻</span>';

            const tr = document.createElement('tr');
            const currentUser = window.getCurrentUser();
            if (currentUser && currentUser.id === user.userId) {
                tr.style.background = 'rgba(0, 255, 136, 0.1)';
                tr.style.fontWeight = 'bold';
            }

            tr.innerHTML = `
                <td><strong>${pos}</strong></td>
                <td>
                    ${user.name}
                    ${user.hasMissedBet ? '<span title="No elegible para último puesto" style="color:var(--danger); font-size:0.8rem; margin-left: 8px;">(X)</span>' : ''}
                    ${badgeHtml}
                </td>
                <td style="color:var(--primary); font-weight: 800;">${user.totalPoints.toFixed(1)}</td>
            `;
            tbody.appendChild(tr);
        });

        // ─── Renderizar Tabla Pichichi ─────────────────────────────────
        const pichTbody = document.getElementById('pichichi-ranking-body');
        pichTbody.innerHTML = '';

        const pichichiRanking = ranking.map(u => ({
            name: u.name,
            points: u.pichichiPoints
        })).sort((a, b) => b.points - a.points);

        pichichiRanking.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>${entry.name}</td>
                <td style="text-align: center; color:var(--primary); font-weight: 800;">⚽ ${entry.points.toFixed(1)}</td>
            `;
            pichTbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error cargando clasificación:", error);
    } finally {
        window.hideLoading();
    }
};

// js/scoring.js
// Lógica para cargar y mostrar la clasificación y el podio (calculada dinámicamente por grupo)

window.loadRanking = async function() {
    window.showLoading();
    try {
        const round2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
        const formatPoints = (n) => round2(n).toFixed(2);

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
            .select('id, fecha_inicio, equipo_local_id, equipo_visitante_id, equipo_local_nombre, equipo_visitante_nombre, goles_local, goles_visitante, fase, estado')
            .eq('tournament_id', tournamentId);

        // ─── Obtener apuestas del grupo (RPC + SELECT; todas las del grupo) ─
        const bets = await window.apiClient.getGroupBets(groupId);
        console.log('[Clasificación] groupId=', groupId, 'bets=', bets.length);

        const betUserIds = new Set(bets.map((b) => String(b.user_id)));
        const memberIds = new Set((members || []).map((m) => String(m.user_id)));
        if (memberIds.size > 1 && betUserIds.size <= 1) {
            console.warn('[Clasificación] Posible RLS: solo se ven apuestas de', betUserIds.size, 'usuario(s). bets=', bets.length);
            window.toast?.error?.(
                'SQL pendiente: ejecuta docs/migrations/2026-07-19_bets_group_select_rls.sql en Supabase (sin esto el (X) y los puntos fallan).'
            );
        }

        // ─── Obtener selecciones Pichichi del grupo ───────────────────
        const { data: favoriteSelections, error: favError } = await window.supabaseClient
            .from('favorite_selections')
            .select('*, teams(id, nombre)')
            .eq('group_id', groupId);

        if (favError) console.error('Error cargando selecciones Pichichi:', favError);

        const teamsCatalog = await window.apiClient.getTeams(tournamentId);
        const groupValues = await window.apiClient.getGroupTeamValues(groupId);

        const aliases = await window.PichichiScoring.loadTeamAliases();
        const { teamsFifaMap, teamsNameToId, aliasMap } = window.PichichiScoring.buildTeamMaps(teamsCatalog, groupValues, aliases);

        // ─── Obtener configuración de premio especial ─────────────────
        const { data: groupConfig } = await window.supabaseClient
            .from('groups')
            .select('special_prize_enabled, special_position')
            .eq('id', groupId)
            .single();

        const specialPrizeEnabled = groupConfig?.special_prize_enabled === true
            || groupConfig?.special_prize_enabled === 'true'
            || groupConfig?.special_prize_enabled === 1;
        const specialPosition = specialPrizeEnabled && Number(groupConfig?.special_position) > 0
            ? Number(groupConfig.special_position)
            : null;

        // Solo cuentan quienes ya guardaron pichichi (favorite_selections)
        const usersWithPichichi = new Set(
            (favoriteSelections || []).map(s => s.user_id)
        );
        const eligibleMembers = members.filter(m => usersWithPichichi.has(m.user_id));

        if (eligibleMembers.length === 0) {
            document.getElementById('ranking-body').innerHTML =
                '<tr><td colspan="3" class="text-center">Nadie ha elegido pichichi todavía.</td></tr>';
            document.getElementById('pichichi-ranking-body').innerHTML =
                '<tr><td colspan="3" class="text-center">Nadie ha elegido pichichi todavía.</td></tr>';
            return;
        }

        // ─── Calcular puntos por usuario ───────────────────────────────
        const userPoints = {};
        const userPichichiPoints = {};

        // Inicializar solo usuarios con pichichi
        eligibleMembers.forEach(member => {
            const uid = String(member.user_id);
            userPoints[uid] = {
                userId: member.user_id,
                name: member.users?.name || 'Anónimo',
                betPoints: 0,
                pichichiPoints: 0,
                totalPoints: 0,
                missedClosedBets: 0,
                isPaqueteEligible: true
            };
            userPichichiPoints[uid] = 0;
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
        if (matches && bets && window.PichichiScoring?.calcBetPointsForMatch) {
            const validMatches = matches.filter(m => (m.fase || 'GROUP_STAGE') !== 'THIRD_PLACE' && (m.fase || 'GROUP_STAGE') !== 'THIRD_PLACE_MATCH');
            const participantIds = Object.keys(userPoints);

            validMatches.forEach(match => {
                if (!window.PichichiScoring.isMatchFinished(match)) return;

                const multiplier = phaseMultipliers[match.fase] || window.PichichiScoring.getPhaseMultiplier(match.fase) || 1;
                const { pointsByUser } = window.PichichiScoring.calcBetPointsForMatch({
                    match,
                    bets,
                    participantIds,
                    multiplier,
                });

                Object.entries(pointsByUser).forEach(([uid, pts]) => {
                    if (userPoints[uid]) {
                        userPoints[uid].betPoints = round2(userPoints[uid].betPoints + pts);
                    }
                });
            });

            // Elegibilidad Premio Paquete (rolling): apuesta en todos los partidos cerrados y apostables
            const now = new Date();
            const closedMatches = validMatches.filter(m => {
                const local = m.equipo_local_nombre;
                const away = m.equipo_visitante_nombre;
                if (!local || !away || local === 'Por definir' || away === 'Por definir') return false;
                if (!m.fecha_inicio) return m.estado !== 'pendiente';
                return new Date(m.fecha_inicio) < now;
            });

            // Indexar apuestas por usuario (ids como string; evita falsos "faltan apuestas")
            const idKey = (id) => (id == null ? '' : String(id));
            const betMatchIdsByUser = {};
            bets.forEach(b => {
                const uid = idKey(b.user_id);
                if (!betMatchIdsByUser[uid]) betMatchIdsByUser[uid] = new Set();
                betMatchIdsByUser[uid].add(idKey(b.match_id));
            });

            console.log(
                '[Clasificación] closedMatches=', closedMatches.length,
                'betsUsers=', Object.keys(betMatchIdsByUser).length,
                'betsTotal=', bets.length
            );

            members.forEach(member => {
                const userId = idKey(member.user_id);
                const userSet = betMatchIdsByUser[userId] || new Set();
                let missed = 0;
                const missedIds = [];
                closedMatches.forEach(match => {
                    if (!userSet.has(idKey(match.id))) {
                        missed++;
                        if (missedIds.length < 5) missedIds.push(idKey(match.id));
                    }
                });
                if (userPoints[userId]) {
                    userPoints[userId].missedClosedBets = missed;
                    userPoints[userId].isPaqueteEligible = missed === 0;
                    if (missed > 0) {
                        console.log('[Clasificación] (X)', userPoints[userId].name, 'missed=', missed, 'ej=', missedIds);
                    }
                }
            });
        }

        // ─── Calcular puntos Pichichi ───────────────────────────────────
        if (matches && favoriteSelections && groupValues?.length && window.PichichiScoring) {
            const fifaValues = Object.values(teamsFifaMap).map(Number).filter((v) => Number.isFinite(v) && v > 0);
            const maxFifaPoints = fifaValues.length > 0 ? Math.max(...fifaValues) : 1000;

            const selectionsByUser = {};
            favoriteSelections.forEach(selection => {
                const userId = String(selection.user_id);
                if (!selectionsByUser[userId]) selectionsByUser[userId] = [];
                selectionsByUser[userId].push(selection);
            });

            Object.entries(selectionsByUser).forEach(([userId, selections]) => {
                const { total } = window.PichichiScoring.calcUserPichichi(
                    selections, matches, maxFifaPoints, teamsFifaMap, teamsNameToId, aliasMap
                );
                if (userPoints[userId]) {
                    // Precisión completa; formatPoints redondea a 2 decimales solo al pintar
                    userPoints[userId].pichichiPoints = Number(total) || 0;
                }
            });
        }

        // ─── Calcular total y ordenar ───────────────────────────────────
        Object.keys(userPoints).forEach(userId => {
            userPoints[userId].totalPoints =
                (Number(userPoints[userId].betPoints) || 0) +
                (Number(userPoints[userId].pichichiPoints) || 0);
        });

        const ranking = Object.values(userPoints).sort((a, b) => b.totalPoints - a.totalPoints);
        const paqueteWinner = ranking.filter(u => u.isPaqueteEligible).slice(-1)[0] || null;

        // Posiciones de clasificación (competición): empates comparten puesto y el siguiente salta
        const displayPositions = [];
        ranking.forEach((user, index) => {
            if (index === 0) {
                displayPositions[index] = 1;
                return;
            }
            const prev = ranking[index - 1];
            if (round2(user.totalPoints) === round2(prev.totalPoints)) {
                displayPositions[index] = displayPositions[index - 1];
            } else {
                displayPositions[index] = index + 1;
            }
        });

        // Premio especial = N-ésimo en la lista ordenada (ordinal), no "puesto denso"
        // Así posición 3 siempre es ranking[2], aunque haya empates arriba.
        const specialOrdinalUser = (specialPosition && ranking.length >= specialPosition)
            ? ranking[specialPosition - 1]
            : null;
        const specialPrizePoints = specialOrdinalUser != null
            ? round2(specialOrdinalUser.totalPoints)
            : null;
        const specialWinners = specialPrizePoints != null
            ? ranking.filter(u => round2(u.totalPoints) === specialPrizePoints)
            : [];

        // ─── Renderizar Podio ───────────────────────────────────────────
        if (ranking[0]) {
            document.getElementById('podium-name-1').textContent = ranking[0].name;
            document.getElementById('podium-pts-1').textContent = `${formatPoints(ranking[0].totalPoints)} pts`;
        } else {
            document.getElementById('podium-name-1').textContent = '--';
            document.getElementById('podium-pts-1').textContent = '0 pts';
        }

        if (ranking[1]) {
            document.getElementById('podium-name-2').textContent = ranking[1].name;
            document.getElementById('podium-pts-2').textContent = `${formatPoints(ranking[1].totalPoints)} pts`;
        } else {
            document.getElementById('podium-name-2').textContent = '--';
            document.getElementById('podium-pts-2').textContent = '0 pts';
        }

        const pNameLast = document.getElementById('podium-name-last');
        if (paqueteWinner) {
            pNameLast.textContent = paqueteWinner.name;
        } else {
            pNameLast.textContent = '--';
        }

        const podiumStepSpecial = document.getElementById('podium-step-special');
        const pNameSpecial = document.getElementById('podium-name-special') || document.getElementById('podium-name-13');
        const pPtsSpecial = document.getElementById('podium-pts-special') || document.getElementById('podium-pts-13');
        const pLabelSpecial = document.getElementById('podium-label-special');

        if (specialOrdinalUser) {
            if (podiumStepSpecial) podiumStepSpecial.style.display = '';
            if (pNameSpecial) {
                pNameSpecial.textContent = specialWinners.length > 1
                    ? `${specialOrdinalUser.name} +${specialWinners.length - 1}`
                    : specialOrdinalUser.name;
            }
            if (pPtsSpecial) {
                pPtsSpecial.textContent = `${formatPoints(specialOrdinalUser.totalPoints)} pts`;
            }
            if (pLabelSpecial) pLabelSpecial.textContent = `${specialPosition}º`;
        } else {
            if (podiumStepSpecial) podiumStepSpecial.style.display = 'none';
            if (pNameSpecial) pNameSpecial.textContent = '--';
            if (pPtsSpecial) pPtsSpecial.textContent = '0 pts';
            if (pLabelSpecial) pLabelSpecial.textContent = 'Especial';
        }

        // ─── Renderizar Tabla General ───────────────────────────────────
        const tbody = document.getElementById('ranking-body');
        tbody.innerHTML = '';

        const specialUserIds = new Set(specialWinners.map(u => u.userId));

        ranking.forEach((user, index) => {
            const pos = displayPositions[index];
            const isSpecial = specialUserIds.has(user.userId);
            const isPaqueteWinner = paqueteWinner && user.userId === paqueteWinner.userId;

            let badgeHtml = '';
            if (index === 0) badgeHtml += '<span class="badge gold ml-2">🥇</span>';
            if (index === 1) badgeHtml += '<span class="badge silver ml-2">🥈</span>';
            if (isPaqueteWinner && ranking.length > 2) badgeHtml += '<span class="badge bronze ml-2">📦</span>';
            if (isSpecial) badgeHtml += '<span class="badge spooky ml-2">🎯</span>';

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
                    ${user.isPaqueteEligible ? '' : '<span title="No elegible para Premio Paquete (faltan apuestas en partidos cerrados)" style="color:var(--danger); font-size:0.8rem; margin-left: 8px;">(X)</span>'}
                    ${badgeHtml}
                </td>
                <td style="color:var(--primary); font-weight: 800;">${formatPoints(user.totalPoints)}</td>
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
                <td style="text-align: center; color:var(--primary); font-weight: 800;">⚽ ${formatPoints(entry.points)}</td>
            `;
            pichTbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error cargando clasificación:", error);
    } finally {
        window.hideLoading();
    }
};

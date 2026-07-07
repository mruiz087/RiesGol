// js/stats.js
// Lógica para mostrar las estadísticas y apuestas de otros usuarios (cuando un partido ya ha empezado)

// Configuración de fases (copiada de matches.js para consistencia)
const PHASE_CONFIG = {
    'GROUP_STAGE':    { label: 'Fase de Grupos',          multiplier: 1 },
    'LAST_32':        { label: 'Dieciseisavos',            multiplier: 2 },
    'LAST_16':        { label: 'Octavos',                  multiplier: 3 },
    'ROUND_OF_16':    { label: 'Octavos',                  multiplier: 3 },
    'QUARTER_FINALS': { label: 'Cuartos',                  multiplier: 4 },
    'SEMI_FINALS':    { label: 'Semifinal',                multiplier: 5 },
    'FINAL':          { label: 'Final',                    multiplier: 6 },
};

const TEAM_NAME_TRANSLATIONS = {
    'GERMANY': 'Alemania', 'SCOTLAND': 'Escocia', 'SPAIN': 'España', 'ITALY': 'Italia',
    'ENGLAND': 'Inglaterra', 'DENMARK': 'Dinamarca', 'FRANCE': 'Francia', 'NETHERLANDS': 'Países Bajos',
    'BELGIUM': 'Bélgica', 'PORTUGAL': 'Portugal', 'POLAND': 'Polonia', 'SWITZERLAND': 'Suiza',
    'AUSTRIA': 'Austria', 'CZECH REPUBLIC': 'República Checa', 'SWEDEN': 'Suecia', 'NORWAY': 'Noruega',
    'GREECE': 'Grecia', 'TURKEY': 'Turquía', 'RUSSIA': 'Rusia', 'UKRAINE': 'Ucrania',
    'HUNGARY': 'Hungría', 'ROMANIA': 'Rumania', 'SERBIA': 'Serbia', 'CROATIA': 'Croacia',
    'BOSNIA AND HERZEGOVINA': 'Bosnia y Herzegovina', 'ICELAND': 'Islandia', 'SLOVENIA': 'Eslovenia',
    'SLOVAKIA': 'Eslovaquia', 'BULGARIA': 'Bulgaria', 'WALES': 'Gales', 'IRELAND': 'Irlanda',
    'NORTHERN IRELAND': 'Irlanda del Norte', 'CYPRUS': 'Chipre', 'MALTA': 'Malta', 'LUXEMBOURG': 'Luxemburgo',
    'BELARUS': 'Bielorrusia', 'LITHUANIA': 'Lituania', 'LATVIA': 'Letonia', 'ESTONIA': 'Estonia',
    'ALBANIA': 'Albania', 'NORTH MACEDONIA': 'Macedonia del Norte', 'MONTENEGRO': 'Montenegro',
    'KOSOVO': 'Kosovo', 'MOLDOVA': 'Moldavia', 'GEORGIA': 'Georgia', 'ARMENIA': 'Armenia',
    'AZERBAIJAN': 'Azerbaiyán', 'BRAZIL': 'Brasil', 'ARGENTINA': 'Argentina', 'COLOMBIA': 'Colombia',
    'VENEZUELA': 'Venezuela', 'URUGUAY': 'Uruguay', 'PARAGUAY': 'Paraguay', 'CHILE': 'Chile',
    'PERU': 'Perú', 'ECUADOR': 'Ecuador', 'BOLIVIA': 'Bolivia', 'SURINAME': 'Surinam',
    'GUYANA': 'Guyana', 'MEXICO': 'México', 'UNITED STATES': 'Estados Unidos', 'CANADA': 'Canadá',
    'COSTA RICA': 'Costa Rica', 'PANAMA': 'Panamá', 'HONDURAS': 'Honduras', 'EL SALVADOR': 'El Salvador',
    'GUATEMALA': 'Guatemala', 'NICARAGUA': 'Nicaragua', 'BELIZE': 'Belice', 'JAMAICA': 'Jamaica',
    'HAITI': 'Haití', 'TRINIDAD AND TOBAGO': 'Trinidad y Tobago', 'CURACAO': 'Curazao',
    'JAPAN': 'Japón', 'SOUTH KOREA': 'Corea del Sur', 'CHINA': 'China', 'INDIA': 'India',
    'SAUDI ARABIA': 'Arabia Saudita', 'UNITED ARAB EMIRATES': 'Emiratos Árabes Unidos', 'IRAN': 'Irán',
    'IRAQ': 'Irak', 'SYRIA': 'Siria', 'LEBANON': 'Líbano', 'ISRAEL': 'Israel',
    'PALESTINE': 'Palestina', 'JORDAN': 'Jordania', 'OMAN': 'Omán', 'QATAR': 'Catar',
    'KUWAIT': 'Kuwait', 'BAHRAIN': 'Baréin', 'YEMEN': 'Yemen', 'THAILAND': 'Tailandia',
    'VIETNAM': 'Vietnam', 'INDONESIA': 'Indonesia', 'MALAYSIA': 'Malasia', 'SINGAPORE': 'Singapur',
    'PHILIPPINES': 'Filipinas', 'BANGLADESH': 'Bangladesh', 'PAKISTAN': 'Pakistán', 'AFGHANISTAN': 'Afganistán',
    'NORTH KOREA': 'Corea del Norte', 'UZBEKISTAN': 'Uzbekistán', 'TAJIKISTAN': 'Tayikistán',
    'KYRGYZSTAN': 'Kirguistán', 'TURKMENISTAN': 'Turkmenistán', 'KAZAKHSTAN': 'Kazajistán',
    'HONG KONG': 'Hong Kong', 'MONGOLIA': 'Mongolia', 'MYANMAR': 'Myanmar', 'CAMBODIA': 'Camboya',
    'LAOS': 'Laos', 'NEPAL': 'Nepal', 'SRI LANKA': 'Sri Lanka', 'MALDIVES': 'Maldivas',
    'BHUTAN': 'Bután', 'MACAU': 'Macao', 'TAIWAN': 'Taiwán', 'EGYPT': 'Egipto',
    'NIGERIA': 'Nigeria', 'GHANA': 'Ghana', 'CAMEROON': 'Camerún', 'IVORY COAST': 'Costa de Marfil',
    'SENEGAL': 'Senegal', 'MOROCCO': 'Marruecos', 'TUNISIA': 'Túnez', 'ALGERIA': 'Argelia',
    'SOUTH AFRICA': 'Sudáfrica', 'ETHIOPIA': 'Etiopía', 'KENYA': 'Kenia', 'UGANDA': 'Uganda',
    'TANZANIA': 'Tanzania', 'ZAMBIA': 'Zambia', 'ZIMBABWE': 'Zimbabue', 'MALI': 'Mali',
    'BURKINA FASO': 'Burkina Faso', 'NIGER': 'Níger', 'BENIN': 'Benín', 'TOGO': 'Togo',
    'LIBERIA': 'Liberia', 'GUINEA': 'Guinea', 'GUINEA-BISSAU': 'Guinea-Bisáu', 'MOZAMBIQUE': 'Mozambique',
    'ANGOLA': 'Angola', 'BOTSWANA': 'Botsuana', 'NAMIBIA': 'Namibia', 'MALAWI': 'Malaui',
    'LESOTHO': 'Lesoto', 'MAURITIUS': 'Mauricio', 'SEYCHELLES': 'Seychelles', 'GABON': 'Gabón',
    'CONGO': 'Congo', 'DR CONGO': 'República Democrática del Congo', 'CENTRAL AFRICAN REPUBLIC': 'República Centroafricana',
    'CHAD': 'Chad', 'SUDAN': 'Sudán', 'SOUTH SUDAN': 'Sudán del Sur', 'LIBYA': 'Libia',
    'MAURITANIA': 'Mauritania', 'DJIBOUTI': 'Yibuti', 'SOMALIA': 'Somalia', 'RWANDA': 'Ruanda',
    'BURUNDI': 'Burundi', 'SIERRA LEONE': 'Sierra Leona', 'COMOROS': 'Comoras', 'MADAGASCAR': 'Madagascar',
    'CAPE VERDE': 'Cabo Verde', 'SAO TOME AND PRINCIPE': 'Santo Tomé y Príncipe', 'EQUATORIAL GUINEA': 'Guinea Ecuatorial',
    'AUSTRALIA': 'Australia', 'NEW ZEALAND': 'Nueva Zelanda', 'FIJI': 'Fiyi', 'SOLOMON ISLANDS': 'Islas Salomón',
    'PAPUA NEW GUINEA': 'Papúa Nueva Guinea', 'SAMOA': 'Samoa', 'VANUATU': 'Vanuatu', 'KIRIBATI': 'Kiribati',
    'NAURU': 'Nauru', 'PALAU': 'Palaos', 'TONGA': 'Tonga', 'TUVALU': 'Tuvalu', 'MARSHALL ISLANDS': 'Islas Marshall',
    'MICRONESIA': 'Micronesia'
};

function translateTeamName(name) {
    if (!name) return name;
    const key = name.trim().toUpperCase();
    return TEAM_NAME_TRANSLATIONS[key] || name;
}

function getPhaseConfig(fase) {
    if (PHASE_CONFIG[fase]) return PHASE_CONFIG[fase];
    const faseUpper = (fase || '').toUpperCase().replace(/ /g, '_');
    if (PHASE_CONFIG[faseUpper]) return PHASE_CONFIG[faseUpper];
    for (const [key, val] of Object.entries(PHASE_CONFIG)) {
        if (faseUpper.includes(key) || key.includes(faseUpper)) return val;
    }
    return { label: fase || 'Desconocida', multiplier: 1 };
}

window.loadStats = async function() {
    window.showLoading();
    try {
        const groupId = window.Groups?.currentGroupId;
        
        if (!window.supabaseClient) {
            console.error("Supabase client no está inicializado");
            return;
        }

        if (!groupId) {
            const container = document.getElementById('stats-container');
            if (container) {
                container.innerHTML = '<p class="text-center">Selecciona una porra primero.</p>';
            }
            return;
        }

        const container = document.getElementById('stats-container');
        if (!container) {
            console.error("No se encontró el contenedor stats-container");
            return;
        }
        container.innerHTML = '';

        console.log("Iniciando carga de estadísticas para grupo:", groupId);

        // 1. Obtener partidos del torneo
        const tournamentId = window.Groups?.currentTournamentId;
        const { data: matches, error: matchesError } = await window.supabaseClient
            .from('matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('fecha_inicio', { ascending: false });

        if (matchesError) {
            console.error("Error obteniendo partidos:", matchesError);
            throw matchesError;
        }

        console.log(`Partidos obtenidos: ${matches?.length || 0}`);

        // Mostrar TODOS los partidos excepto THIRD_PLACE
        const validMatches = matches.filter(m => {
            const fase = m.fase || 'GROUP_STAGE';
            const isNotThirdPlace = fase !== 'THIRD_PLACE' && fase !== 'THIRD_PLACE_MATCH';
            return isNotThirdPlace;
        });
        console.log(`Partidos válidos (sin THIRD_PLACE): ${validMatches.length}`);

        if (validMatches.length === 0) {
            container.innerHTML = '<p class="text-center">No hay partidos disponibles.</p>';
            return;
        }

        // 2. Obtener apuestas del grupo
        const { data: bets, error: betsError } = await window.supabaseClient
            .from('bets')
            .select('match_id, prediccion, users(name)')
            .eq('group_id', groupId);

        if (betsError) {
            console.error("Error obteniendo apuestas:", betsError);
        }

        console.log(`Total apuestas en grupo: ${bets?.length || 0}`);

        // 3. Calcular estadísticas globales por fase
        const phaseStats = {};
        validMatches.forEach(match => {
            const fase = match.fase || 'GROUP_STAGE';
            if (!phaseStats[fase]) {
                phaseStats[fase] = { total: 0, correct: 0, finished: 0 };
            }
            
            if (match.estado === 'finalizado') {
                phaseStats[fase].finished++;
                phaseStats[fase].total++;
                
                // Determinar resultado real
                let resultado = 'X';
                if (match.goles_local > match.goles_visitante) resultado = '1';
                else if (match.goles_visitante > match.goles_local) resultado = '2';
                
                // Contar aciertos
                const matchBets = bets ? bets.filter(b => b.match_id === match.id) : [];
                const correctBets = matchBets.filter(b => b.prediccion === resultado).length;
                phaseStats[fase].correct += correctBets;
            }
        });

        // 4. Renderizar estadísticas globales por fase
        const globalStatsSection = document.createElement('div');
        globalStatsSection.className = 'glass-panel';
        globalStatsSection.style.marginBottom = '2rem';
        
        let globalStatsHtml = '<h3 style="margin-bottom: 1rem;">Estadísticas por Fase</h3>';
        Object.keys(phaseStats).forEach(fase => {
            const config = getPhaseConfig(fase);
            const stats = phaseStats[fase];
            const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            
            globalStatsHtml += `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span>${config.label}</span>
                    <span>${stats.correct}/${stats.total} aciertos (${accuracy}%)</span>
                </div>
            `;
        });
        globalStatsSection.innerHTML = globalStatsHtml;
        container.appendChild(globalStatsSection);

        // 6. Calcular estadísticas por usuario
        const userStats = {};
        if (bets) {
            bets.forEach(bet => {
                const userName = (bet.users && bet.users.name) ? bet.users.name : 'Anónimo';
                if (!userStats[userName]) {
                    userStats[userName] = { total: 0, correct: 0, missed: 0 };
                }
                userStats[userName].total++;
                
                // Verificar si acertó
                const match = validMatches.find(m => m.id === bet.match_id);
                if (match && match.estado === 'finalizado') {
                    let resultado = 'X';
                    if (match.goles_local > match.goles_visitante) resultado = '1';
                    else if (match.goles_visitante > match.goles_local) resultado = '2';
                    
                    if (bet.prediccion === resultado) {
                        userStats[userName].correct++;
                    }
                }
            });
            
            // Calcular partidos perdidos (finalizados sin apuesta)
            const finishedMatches = validMatches.filter(m => m.estado === 'finalizado');
            Object.keys(userStats).forEach(userName => {
                const userBets = bets.filter(b => (b.users && b.users.name) === userName);
                const missed = finishedMatches.length - userBets.filter(b => {
                    const match = validMatches.find(m => m.id === b.match_id);
                    return match && match.estado === 'finalizado';
                }).length;
                userStats[userName].missed = missed;
            });
        }

        // 7. Renderizar estadísticas por usuario
        const userStatsSection = document.createElement('div');
        userStatsSection.className = 'glass-panel';
        userStatsSection.style.marginBottom = '2rem';
        
        let userStatsHtml = '<h3 style="margin-bottom: 1rem;">Estadísticas por Usuario</h3>';
        const sortedUsers = Object.entries(userStats).sort((a, b) => b[1].correct - a[1].correct);
        
        sortedUsers.forEach(([userName, stats]) => {
            const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            userStatsHtml += `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span>${userName}</span>
                    <span>${stats.correct}/${stats.total} aciertos (${accuracy}%) - ${stats.missed} perdidos</span>
                </div>
            `;
        });
        userStatsSection.innerHTML = userStatsHtml;
        container.appendChild(userStatsSection);

        // 8. Agrupar partidos por fase
        const phaseOrder = [];
        const phaseGroups = {};
        validMatches.forEach(match => {
            const fase = match.fase || 'GROUP_STAGE';
            if (!phaseGroups[fase]) {
                phaseGroups[fase] = [];
                phaseOrder.push(fase);
            }
            phaseGroups[fase].push(match);
        });

        console.log(`Fases encontradas:`, phaseOrder);
        console.log(`Grupos de fases:`, phaseGroups);

        // 4. Renderizar estadísticas agrupadas por fase
        phaseOrder.forEach(fase => {
            const config = getPhaseConfig(fase);

            const section = document.createElement('details');
            section.className = 'phase-section';
            section.setAttribute('open', ''); // Todas abiertas por defecto en estadísticas

            section.innerHTML = `
                <summary class="phase-summary">
                    <span class="phase-label">${config.label}</span>
                    <span class="phase-multiplier">✕${config.multiplier} puntos</span>
                    <span class="phase-count">${phaseGroups[fase].length} partidos</span>
                    <span class="phase-chevron">›</span>
                </summary>
                <div class="stats-phase-content"></div>
            `;

            const content = section.querySelector('.stats-phase-content');
            phaseGroups[fase].forEach(match => {
                const matchBets = bets ? bets.filter(b => b.match_id === match.id) : [];
                
                let count1 = 0, countX = 0, count2 = 0;
                const users1 = [], usersX = [], users2 = [];

                matchBets.forEach(bet => {
                    const userName = (bet.users && bet.users.name) ? bet.users.name : 'Anónimo';
                    if (bet.prediccion === '1') { count1++; users1.push(userName); }
                    else if (bet.prediccion === 'X') { countX++; usersX.push(userName); }
                    else if (bet.prediccion === '2') { count2++; users2.push(userName); }
                });

                const total = matchBets.length;
                const pct1 = total ? Math.round((count1 / total) * 100) : 0;
                const pctX = total ? Math.round((countX / total) * 100) : 0;
                const pct2 = total ? Math.round((count2 / total) * 100) : 0;

                const card = document.createElement('div');
                card.className = 'glass-panel stats-card';
                const localTeamName = translateTeamName(match.equipo_local_nombre);
                const awayTeamName = translateTeamName(match.equipo_visitante_nombre);
                
                // Si no hay apuestas, mostrar "Sin apuestas"
                const noAppuestas = total === 0;
                const statsContent = noAppuestas ? 
                    '<div class="stat-users" style="grid-column: 1 / -1; text-align: center; color: var(--muted);">Sin apuestas registradas</div>' :
                    `
                    <div class="stat-column">
                        <div class="stat-percentage">${pct1}%</div>
                        <div class="stat-label">1 (${count1})</div>
                        <div class="stat-users">${users1.join(', ')}</div>
                    </div>
                    <div class="stat-column">
                        <div class="stat-percentage">${pctX}%</div>
                        <div class="stat-label">X (${countX})</div>
                        <div class="stat-users">${usersX.join(', ')}</div>
                    </div>
                    <div class="stat-column">
                        <div class="stat-percentage">${pct2}%</div>
                        <div class="stat-label">2 (${count2})</div>
                        <div class="stat-users">${users2.join(', ')}</div>
                    </div>
                    `;
                
                card.innerHTML = `
                    <h3 class="stats-match-title">
                        ${localTeamName}
                        <span class="vs">vs</span>
                        ${awayTeamName}
                    </h3>
                    <div class="stats-bet-breakdown">
                        ${statsContent}
                    </div>
                `;
                content.appendChild(card);
            });

            container.appendChild(section);
        });

        console.log("Estadísticas renderizadas correctamente");

    } catch (error) {
        console.error("Error cargando estadísticas", error);
        const container = document.getElementById('stats-container');
        if (container) {
            container.innerHTML = `<p class="text-center" style="color: var(--danger);">Error al cargar estadísticas: ${error.message}</p>`;
        }
    } finally {
        window.hideLoading();
    }
};

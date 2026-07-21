// js/flags.js
// Banderas (flagcdn) + escudos de club (crest_url de football-data)

const TEAM_ISO_CODES = {
    'GERMANY': 'de',
    'SCOTLAND': 'gb-sct',
    'SPAIN': 'es',
    'ITALY': 'it',
    'ENGLAND': 'gb-eng',
    'DENMARK': 'dk',
    'FRANCE': 'fr',
    'NETHERLANDS': 'nl',
    'BELGIUM': 'be',
    'PORTUGAL': 'pt',
    'POLAND': 'pl',
    'SWITZERLAND': 'ch',
    'AUSTRIA': 'at',
    'CZECH REPUBLIC': 'cz',
    'CZECHIA': 'cz',
    'SWEDEN': 'se',
    'NORWAY': 'no',
    'GREECE': 'gr',
    'TURKEY': 'tr',
    'TÜRKIYE': 'tr',
    'RUSSIA': 'ru',
    'UKRAINE': 'ua',
    'HUNGARY': 'hu',
    'ROMANIA': 'ro',
    'SERBIA': 'rs',
    'CROATIA': 'hr',
    'BOSNIA AND HERZEGOVINA': 'ba',
    'ICELAND': 'is',
    'SLOVENIA': 'si',
    'SLOVAKIA': 'sk',
    'BULGARIA': 'bg',
    'WALES': 'gb-wls',
    'IRELAND': 'ie',
    'REPUBLIC OF IRELAND': 'ie',
    'NORTHERN IRELAND': 'gb-nir',
    'CYPRUS': 'cy',
    'MALTA': 'mt',
    'LUXEMBOURG': 'lu',
    'BELARUS': 'by',
    'LITHUANIA': 'lt',
    'LATVIA': 'lv',
    'ESTONIA': 'ee',
    'ALBANIA': 'al',
    'NORTH MACEDONIA': 'mk',
    'MONTENEGRO': 'me',
    'KOSOVO': 'xk',
    'MOLDOVA': 'md',
    'GEORGIA': 'ge',
    'ARMENIA': 'am',
    'AZERBAIJAN': 'az',
    'BRAZIL': 'br',
    'ARGENTINA': 'ar',
    'COLOMBIA': 'co',
    'VENEZUELA': 've',
    'URUGUAY': 'uy',
    'PARAGUAY': 'py',
    'CHILE': 'cl',
    'PERU': 'pe',
    'ECUADOR': 'ec',
    'BOLIVIA': 'bo',
    'SURINAME': 'sr',
    'GUYANA': 'gy',
    'MEXICO': 'mx',
    'UNITED STATES': 'us',
    'USA': 'us',
    'CANADA': 'ca',
    'COSTA RICA': 'cr',
    'PANAMA': 'pa',
    'HONDURAS': 'hn',
    'EL SALVADOR': 'sv',
    'GUATEMALA': 'gt',
    'NICARAGUA': 'ni',
    'BELIZE': 'bz',
    'JAMAICA': 'jm',
    'HAITI': 'ht',
    'TRINIDAD AND TOBAGO': 'tt',
    'CURACAO': 'cw',
    'JAPAN': 'jp',
    'SOUTH KOREA': 'kr',
    'KOREA REPUBLIC': 'kr',
    'CHINA': 'cn',
    'CHINA PR': 'cn',
    'INDIA': 'in',
    'SAUDI ARABIA': 'sa',
    'UNITED ARAB EMIRATES': 'ae',
    'IRAN': 'ir',
    'ISLAMIC REPUBLIC OF IRAN': 'ir',
    'IRAQ': 'iq',
    'SYRIA': 'sy',
    'LEBANON': 'lb',
    'ISRAEL': 'il',
    'PALESTINE': 'ps',
    'JORDAN': 'jo',
    'OMAN': 'om',
    'QATAR': 'qa',
    'KUWAIT': 'kw',
    'BAHRAIN': 'bh',
    'YEMEN': 'ye',
    'THAILAND': 'th',
    'VIETNAM': 'vn',
    'INDONESIA': 'id',
    'MALAYSIA': 'my',
    'SINGAPORE': 'sg',
    'PHILIPPINES': 'ph',
    'BANGLADESH': 'bd',
    'PAKISTAN': 'pk',
    'AFGHANISTAN': 'af',
    'NORTH KOREA': 'kp',
    'UZBEKISTAN': 'uz',
    'TAJIKISTAN': 'tj',
    'KYRGYZSTAN': 'kg',
    'TURKMENISTAN': 'tm',
    'KAZAKHSTAN': 'kz',
    'HONG KONG': 'hk',
    'MONGOLIA': 'mn',
    'MYANMAR': 'mm',
    'CAMBODIA': 'kh',
    'LAOS': 'la',
    'NEPAL': 'np',
    'SRI LANKA': 'lk',
    'MALDIVES': 'mv',
    'BHUTAN': 'bt',
    'MACAU': 'mo',
    'TAIWAN': 'tw',
    'EGYPT': 'eg',
    'NIGERIA': 'ng',
    'GHANA': 'gh',
    'CAMEROON': 'cm',
    'IVORY COAST': 'ci',
    "CÔTE D'IVOIRE": 'ci',
    'COTE D\'IVOIRE': 'ci',
    'SENEGAL': 'sn',
    'MOROCCO': 'ma',
    'TUNISIA': 'tn',
    'ALGERIA': 'dz',
    'SOUTH AFRICA': 'za',
    'ETHIOPIA': 'et',
    'KENYA': 'ke',
    'UGANDA': 'ug',
    'TANZANIA': 'tz',
    'ZAMBIA': 'zm',
    'ZIMBABWE': 'zw',
    'MALI': 'ml',
    'BURKINA FASO': 'bf',
    'NIGER': 'ne',
    'BENIN': 'bj',
    'TOGO': 'tg',
    'LIBERIA': 'lr',
    'GUINEA': 'gn',
    'GUINEA-BISSAU': 'gw',
    'MOZAMBIQUE': 'mz',
    'ANGOLA': 'ao',
    'BOTSWANA': 'bw',
    'NAMIBIA': 'na',
    'MALAWI': 'mw',
    'LESOTHO': 'ls',
    'MAURITIUS': 'mu',
    'SEYCHELLES': 'sc',
    'GABON': 'ga',
    'CONGO': 'cg',
    'DR CONGO': 'cd',
    'CENTRAL AFRICAN REPUBLIC': 'cf',
    'CHAD': 'td',
    'SUDAN': 'sd',
    'SOUTH SUDAN': 'ss',
    'LIBYA': 'ly',
    'MAURITANIA': 'mr',
    'DJIBOUTI': 'dj',
    'SOMALIA': 'so',
    'RWANDA': 'rw',
    'BURUNDI': 'bi',
    'SIERRA LEONE': 'sl',
    'COMOROS': 'km',
    'MADAGASCAR': 'mg',
    'CAPE VERDE': 'cv',
    'SAO TOME AND PRINCIPE': 'st',
    'EQUATORIAL GUINEA': 'gq',
    'AUSTRALIA': 'au',
    'NEW ZEALAND': 'nz',
    'FIJI': 'fj',
    'SOLOMON ISLANDS': 'sb',
    'PAPUA NEW GUINEA': 'pg',
    'SAMOA': 'ws',
    'VANUATU': 'vu',
    'KIRIBATI': 'ki',
    'NAURU': 'nr',
    'PALAU': 'pw',
    'TONGA': 'to',
    'TUVALU': 'tv',
    'MARSHALL ISLANDS': 'mh',
    'MICRONESIA': 'fm',
    // Alias habituales football-data.org / FIFA
    'TURKIYE': 'tr',
    'FYR MACEDONIA': 'mk',
    'FYROM': 'mk',
    'MACEDONIA': 'mk',
    'KOREA REPUBLIC': 'kr',
    'KOREA DPR': 'kp',
    'CHINA PR': 'cn',
    'PR CHINA': 'cn',
    'IR IRAN': 'ir',
    'IRAN ISLAMIC REPUBLIC OF': 'ir',
    'USA': 'us',
    'UNITED STATES OF AMERICA': 'us',
    'BOSNIA-HERZEGOVINA': 'ba',
    'BOSNIA HERZEGOVINA': 'ba',
    'COTE DIVOIRE': 'ci',
    "COTE D'IVOIRE": 'ci',
    'IVORYCOAST': 'ci',
    'THE NETHERLANDS': 'nl',
    'HOLLAND': 'nl',
    'FAROE ISLANDS': 'fo',
    'GIBRALTAR': 'gi',
    'ANDORRA': 'ad',
    'SAN MARINO': 'sm',
    'LIECHTENSTEIN': 'li',
    'HONG KONG CHINA': 'hk',
    'CHINESE TAIPEI': 'tw',
    'TAIPEI': 'tw',
    'CURAÇAO': 'cw',
    'ST KITTS AND NEVIS': 'kn',
    'SAINT KITTS AND NEVIS': 'kn',
    'SAINT LUCIA': 'lc',
    'ST LUCIA': 'lc',
    'GRENADA': 'gd',
    'DOMINICA': 'dm',
    'DOMINICAN REPUBLIC': 'do',
    'PUERTO RICO': 'pr',
    'CUBA': 'cu',
    'NEW CALEDONIA': 'nc',
    'TAHITI': 'pf',
    // Nombres en español (por si llegan traducidos)
    'ALEMANIA': 'de',
    'ESCOCIA': 'gb-sct',
    'ESPANA': 'es',
    'ITALIA': 'it',
    'INGLATERRA': 'gb-eng',
    'DINAMARCA': 'dk',
    'FRANCIA': 'fr',
    'PAISES BAJOS': 'nl',
    'BELGICA': 'be',
    'POLONIA': 'pl',
    'SUIZA': 'ch',
    'REPUBLICA CHECA': 'cz',
    'SUECIA': 'se',
    'NORUEGA': 'no',
    'GRECIA': 'gr',
    'TURQUIA': 'tr',
    'RUSIA': 'ru',
    'UCRANIA': 'ua',
    'HUNGRIA': 'hu',
    'RUMANIA': 'ro',
    'CROACIA': 'hr',
    'BOSNIA Y HERZEGOVINA': 'ba',
    'ISLANDIA': 'is',
    'ESLOVENIA': 'si',
    'ESLOVAQUIA': 'sk',
    'GALES': 'gb-wls',
    'IRLANDA': 'ie',
    'IRLANDA DEL NORTE': 'gb-nir',
    'CHIPRE': 'cy',
    'LUXEMBURGO': 'lu',
    'BIELORRUSIA': 'by',
    'LITUANIA': 'lt',
    'LETONIA': 'lv',
    'ESTONIA': 'ee',
    'MACEDONIA DEL NORTE': 'mk',
    'MOLDAVIA': 'md',
    'GEORGIA': 'ge',
    'ARMENIA': 'am',
    'AZERBAIYAN': 'az',
    'BRASIL': 'br',
    'MEXICO': 'mx',
    'ESTADOS UNIDOS': 'us',
    'CANADA': 'ca',
    'JAPON': 'jp',
    'COREA DEL SUR': 'kr',
    'ARABIA SAUDITA': 'sa',
    'EMIRATOS ARABES UNIDOS': 'ae',
    'IRAN': 'ir',
    'CATAR': 'qa',
    'EGIPTO': 'eg',
    'CAMERUN': 'cm',
    'COSTA DE MARFIL': 'ci',
    'MARRUECOS': 'ma',
    'TUNEZ': 'tn',
    'ARGELIA': 'dz',
    'SUDAFRICA': 'za',
    'AUSTRALIA': 'au',
    'NUEVA ZELANDA': 'nz',
};

function normalizeTeamKey(name) {
    return String(name || '')
        .trim()
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'i')
        .replace(/ß/g, 'ss')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[''`´]/g, '')
        .replace(/[^A-Z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

window.getTeamFlagUrl = function(teamName) {
    if (!teamName || teamName === 'Por definir') return null;

    const raw = teamName.trim().toUpperCase();
    const normalized = normalizeTeamKey(teamName);
    const compact = normalized.replace(/\s+/g, '');

    let iso = TEAM_ISO_CODES[raw] || TEAM_ISO_CODES[normalized] || TEAM_ISO_CODES[compact];

    if (!iso) {
        for (const [key, code] of Object.entries(TEAM_ISO_CODES)) {
            const nk = normalizeTeamKey(key);
            if (nk === normalized || nk.replace(/\s+/g, '') === compact) {
                iso = code;
                break;
            }
        }
    }

    // Coincidencia parcial (p. ej. "Republic of Ireland" ↔ "IRELAND")
    if (!iso) {
        const candidates = Object.entries(TEAM_ISO_CODES)
            .map(([key, code]) => ({ key: normalizeTeamKey(key), code }))
            .filter(({ key }) => key.length >= 4)
            .sort((a, b) => b.key.length - a.key.length);

        for (const { key, code } of candidates) {
            if (normalized.includes(key) || key.includes(normalized)) {
                iso = code;
                break;
            }
        }
    }

    if (!iso && window.TEAM_NAME_TRANSLATIONS) {
        for (const [en, es] of Object.entries(window.TEAM_NAME_TRANSLATIONS)) {
            if (normalizeTeamKey(es) === normalized || String(es).toUpperCase() === raw) {
                iso = TEAM_ISO_CODES[en] || TEAM_ISO_CODES[normalizeTeamKey(en)];
                if (iso) break;
            }
        }
    }

    if (!iso) return null;
    return `https://flagcdn.com/w40/${iso}.png`;
};

/** Mapa nombre API → crest_url (rellenado al cargar equipos del torneo). */
window.setTeamCrestMap = function(teamsOrMap) {
    const byName = {};
    const byId = {};
    if (Array.isArray(teamsOrMap)) {
        teamsOrMap.forEach((t) => {
            const url = t?.crest_url;
            if (!url) return;
            if (t.nombre) byName[String(t.nombre)] = url;
            if (t.id != null) byId[String(t.id)] = url;
        });
    } else if (teamsOrMap && typeof teamsOrMap === 'object') {
        Object.assign(byName, teamsOrMap);
    }
    window.__teamCrestByName = byName;
    window.__teamCrestById = byId;
};

window.getTeamCrestUrl = function(teamName, opts) {
    if (opts?.crestUrl) return opts.crestUrl;
    if (opts?.teamId != null && window.__teamCrestById?.[String(opts.teamId)]) {
        return window.__teamCrestById[String(opts.teamId)];
    }
    if (!teamName || teamName === 'Por definir') return null;
    const map = window.__teamCrestByName || {};
    if (map[teamName]) return map[teamName];
    const trimmed = String(teamName).trim();
    if (map[trimmed]) return map[trimmed];
    return null;
};

/**
 * Badge híbrido: escudo (club) si hay crest_url; si no, bandera flagcdn (selecciones).
 * @param {string} teamName nombre API del equipo
 * @param {{ crestUrl?: string, teamId?: string|number }} [opts]
 */
window.teamBadgeHtml = function(teamName, opts) {
    const crest = window.getTeamCrestUrl?.(teamName, opts);
    if (crest) {
        const alt = teamName ? `Escudo de ${teamName}` : 'Escudo';
        const safeAlt = alt.replace(/"/g, '&quot;');
        const safeSrc = String(crest).replace(/"/g, '&quot;');
        return `<img class="team-flag team-crest" src="${safeSrc}" alt="${safeAlt}" width="24" height="24" loading="lazy" decoding="async">`;
    }

    const url = window.getTeamFlagUrl(teamName);
    if (!url) {
        return `<span class="team-flag team-flag-missing" title="Sin escudo/bandera: ${String(teamName || '').replace(/"/g, '')}" aria-hidden="true"></span>`;
    }
    const alt = teamName ? `Bandera de ${teamName}` : '';
    const safeAlt = alt.replace(/"/g, '&quot;');
    return `<img class="team-flag" src="${url}" alt="${safeAlt}" width="24" height="18" loading="lazy" decoding="async">`;
};

/** Alias: mismo badge híbrido (escudo o bandera). */
window.teamFlagHtml = function(teamName, opts) {
    return window.teamBadgeHtml(teamName, opts);
};

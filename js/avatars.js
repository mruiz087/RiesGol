// js/avatars.js
// 100 avatares compactos (emoji + fondo). Sin archivos SVG externos.

(function () {
    // [id, label, emoji, color de fondo]
    const RAW = [
        // Fútbol / deporte
        ['ball', 'Balón', '⚽', '#1b4332'],
        ['goal', 'Gol', '🥅', '#264653'],
        ['trophy', 'Copa', '🏆', '#bc6c25'],
        ['medal', 'Medalla', '🥇', '#9c6644'],
        ['whistle', 'Árbitro', '🦺', '#343a40'],
        ['run', 'Sprint', '🏃', '#2a9d8f'],
        ['bike', 'Bici', '🚴', '#1d3557'],
        ['swim', 'Nadar', '🏊', '#0077b6'],
        ['basket', 'Basket', '🏀', '#e76f51'],
        ['tennis', 'Tenis', '🎾', '#40916c'],
        // Caras / humor
        ['lol', 'Risa', '😂', '#e9c46a'],
        ['cool', 'Guay', '😎', '#264653'],
        ['think', 'Pensando', '🤔', '#6c757d'],
        ['wow', 'Flipado', '🤯', '#e63946'],
        ['sleep', 'Siesta', '😴', '#457b9d'],
        ['party', 'Fiesta', '🥳', '#9b2226'],
        ['devil', 'Diablillo', '😈', '#5c4d7a'],
        ['angel', 'Angelito', '😇', '#90e0ef'],
        ['nerd', 'Empollón', '🤓', '#495057'],
        ['robot', 'Robot', '🤖', '#6c757d'],
        // Animales
        ['dog', 'Perro', '🐶', '#d4a373'],
        ['cat', 'Gato', '🐱', '#f4a261'],
        ['fox', 'Zorro', '🦊', '#e76f51'],
        ['wolf', 'Lobo', '🐺', '#495057'],
        ['lion', 'León', '🦁', '#bc6c25'],
        ['tiger', 'Tigre', '🐯', '#e9c46a'],
        ['bear', 'Oso', '🐻', '#9c6644'],
        ['panda', 'Panda', '🐼', '#212529'],
        ['monkey', 'Mono', '🐵', '#d4a373'],
        ['frog', 'Rana', '🐸', '#2d6a4f'],
        ['owl', 'Búho', '🦉', '#6c584c'],
        ['penguin', 'Pingüino', '🐧', '#1d3557'],
        ['whale', 'Ballena', '🐋', '#0077b6'],
        ['octopus', 'Pulpo', '🐙', '#9b5de5'],
        ['unicorn', 'Unicornio', '🦄', '#f72585'],
        // Comida
        ['pizza', 'Pizza', '🍕', '#e76f51'],
        ['taco', 'Taco', '🌮', '#e9c46a'],
        ['burger', 'Burger', '🍔', '#bc6c25'],
        ['ramen', 'Ramen', '🍜', '#f4a261'],
        ['sushi', 'Sushi', '🍣', '#e63946'],
        ['paella', 'Paella', '🥘', '#e9c46a'],
        ['tortilla', 'Tortilla', '🥚', '#f4e3b0'],
        ['coffee', 'Café', '☕', '#6c584c'],
        ['beer', 'Caña', '🍺', '#e9c46a'],
        ['ice', 'Helado', '🍦', '#90e0ef'],
        ['donut', 'Donut', '🍩', '#f72585'],
        ['avocado', 'Aguacate', '🥑', '#2d6a4f'],
        ['chili', 'Picante', '🌶️', '#c1121f'],
        ['grape', 'Uvas', '🍇', '#7b2cbf'],
        // Naturaleza / clima
        ['sun', 'Sol', '☀️', '#e9c46a'],
        ['moon', 'Luna', '🌙', '#1d3557'],
        ['star', 'Estrella', '⭐', '#264653'],
        ['fire', 'Fuego', '🔥', '#e63946'],
        ['thunder', 'Rayo', '⚡', '#e9c46a'],
        ['rainbow', 'Arcoíris', '🌈', '#4cc9f0'],
        ['snow', 'Nieve', '❄️', '#90e0ef'],
        ['palm', 'Palmera', '🌴', '#2d6a4f'],
        ['cactus', 'Cactus', '🌵', '#40916c'],
        ['mushroom', 'Seta', '🍄', '#e76f51'],
        // Objetos / tech / viaje
        ['rocket', 'Cohete', '🚀', '#1d3557'],
        ['alien', 'Alien', '👽', '#2d6a4f'],
        ['ghost', 'Fantasma', '👻', '#6c757d'],
        ['skull', 'Calavera', '💀', '#343a40'],
        ['game', 'Juegos', '🎮', '#5c4d7a'],
        ['dice', 'Dados', '🎲', '#c1121f'],
        ['music', 'Música', '🎵', '#9b5de5'],
        ['guitar', 'Guitarra', '🎸', '#9c6644'],
        ['camera', 'Cámara', '📷', '#495057'],
        ['movie', 'Cine', '🎬', '#212529'],
        ['book', 'Libro', '📚', '#457b9d'],
        ['pencil', 'Lápiz', '✏️', '#e9c46a'],
        ['bulb', 'Idea', '💡', '#e9c46a'],
        ['money', 'Pasta', '💰', '#2d6a4f'],
        ['gem', 'Gema', '💎', '#4cc9f0'],
        ['key', 'Llave', '🔑', '#e9c46a'],
        ['lock', 'Candado', '🔒', '#6c757d'],
        ['plane', 'Avión', '✈️', '#0077b6'],
        ['car', 'Coche', '🚗', '#e63946'],
        ['train', 'Tren', '🚂', '#495057'],
        ['ship', 'Barco', '🚢', '#1d3557'],
        // Variados extra
        ['heart', 'Corazón', '❤️', '#c1121f'],
        ['peace', 'Paz', '✌️', '#90e0ef'],
        ['clap', 'Aplauso', '👏', '#e9c46a'],
        ['strong', 'Fuerte', '💪', '#e76f51'],
        ['magic', 'Magia', '🪄', '#7b2cbf'],
        ['crown', 'Corona', '👑', '#e9c46a'],
        ['ninja', 'Ninja', '🥷', '#212529'],
        ['cowboy', 'Vaquero', '🤠', '#bc6c25'],
        ['clown', 'Payaso', '🤡', '#f72585'],
        ['poop', 'Caca', '💩', '#9c6644'],
        ['eyes', 'Ojitos', '👀', '#6c757d'],
        ['tongue', 'Lengua', '😜', '#e9c46a'],
        ['kiss', 'Beso', '😘', '#f72585'],
        ['zzz', 'Zzz', '💤', '#457b9d'],
        ['ok', 'OK', '👌', '#2a9d8f'],
        ['flex', 'Flex', '🤙', '#4cc9f0'],
        ['spain', 'España', '🇪🇸', '#c1121f'],
        ['globe', 'Mundo', '🌍', '#1d3557'],
        ['clock', 'Reloj', '⏰', '#495057'],
        ['gift', 'Regalo', '🎁', '#e63946'],
    ];

    function toDataUri(emoji, bg) {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
            `<rect width="64" height="64" rx="32" fill="${bg}"/>` +
            `<text x="32" y="42" text-anchor="middle" font-size="30">${emoji}</text>` +
            `</svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    const AVATARS = RAW.map(([id, label, emoji, bg]) => ({
        id,
        label,
        emoji,
        bg,
        src: toDataUri(emoji, bg),
    }));

    const DEFAULT_ID = 'ball';

    function getAvatarById(id) {
        const key = String(id || '').trim();
        return AVATARS.find((a) => a.id === key) || AVATARS.find((a) => a.id === DEFAULT_ID) || AVATARS[0];
    }

    function avatarSrc(id) {
        return getAvatarById(id).src;
    }

    function avatarImgHtml(id, className = '') {
        const a = getAvatarById(id);
        const cls = className ? ` class="${className}"` : '';
        return `<img${cls} src="${a.src}" alt="${a.label}" width="64" height="64" loading="lazy" />`;
    }

    function fillAvatarEl(el, id) {
        if (!el) return;
        const a = getAvatarById(id);
        el.innerHTML = `<img src="${a.src}" alt="${a.label}" width="64" height="64" />`;
    }

    window.Avatars = {
        AVATARS,
        DEFAULT_ID,
        getAvatarById,
        avatarSrc,
        avatarImgHtml,
        fillAvatarEl,
    };
})();

const CACHE_NAME = 'riesgol-v14';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/supabase.js',
    './js/auth.js',
    './js/api.js',
    './js/pichichi-scoring.js',
    './js/flags.js',
    './js/matches.js',
    './js/results.js',
    './js/scoring.js',
    './js/pichichi.js',
    './js/stats.js',
    './js/groups.js',
    './js/admin.js',
    './js/opciones.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@500;700;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    // Si no hay red y no está en caché, no podemos hacer mucho más,
                    // pero para la DB (Supabase) manejaremos errores en el cliente.
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

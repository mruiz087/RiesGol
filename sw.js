const CACHE_NAME = 'riesgol-v66';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/supabase.js',
    './js/debug.js',
    './js/auth.js',
    './js/api.js',
    './js/pichichi-scoring.js',
    './js/scoring-rules.js',
    './js/avatars.js',
    './js/flags.js',
    './js/matches.js',
    './js/results.js',
    './js/scoring.js',
    './js/pichichi.js',
    './js/groups.js',
    './js/admin.js',
    './js/opciones.js',
];

function isAppShellRequest(request) {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    const path = url.pathname;
    return (
        path.endsWith('/') ||
        path.endsWith('.html') ||
        path.endsWith('.js') ||
        path.endsWith('.css')
    );
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

// HTML/JS/CSS: red primero (evita quedarse con results.js / scoring.js viejos).
// Resto: cache-first para offline básico.
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    if (isAppShellRequest(request)) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
    );
});

// ==========================================
// SW.JS - Service Worker
// Offline support ve caching stratejisi
// ==========================================

const CACHE_NAME = 'kpss-tarih-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/css/responsive.css',
    '/css/animations.css',
    '/config.js',
    '/js/app.js',
    '/js/utils/constants.js',
    '/js/utils/helpers.js',
    '/js/modules/contentPool.js',
    '/js/modules/userProgress.js',
    '/js/modules/gameEngine.js',
    '/js/modules/uiRenderer.js',
    '/js/modules/geoServices.js',
    '/js/modules/aiProvider.js',
    '/js/modules/googleSheets.js',
    '/data/curriculum.json'
];

// Installation
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell');
                return cache.addAll(URLS_TO_CACHE).catch(err => {
                    console.warn('[SW] Some files failed to cache:', err);
                    // Hepsi cache'lenmese bile devam et
                    return cache.addAll(URLS_TO_CACHE.filter(url => !url.includes('data/')));
                });
            })
    );
    self.skipWaiting();
});

// Activation
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // API çağrıları: network only (offline'da çalışmaz)
    if (request.url.includes('api.anthropic.com') || 
        request.url.includes('nominatim.openstreetmap.org') ||
        request.url.includes('script.google.com')) {
        return event.respondWith(fetch(request));
    }
    
    // Statik dosyalar: cache first, then network
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    // Background update
                    fetch(request).then(newResponse => {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, newResponse);
                        });
                    }).catch(() => {});
                    
                    return response;
                }
                
                return fetch(request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                return caches.match('/index.html');
            })
    );
});

// Background sync (opsiyonel, ileri özellik)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-progress') {
        event.waitUntil(
            // Google Sheets'e data senkronizasyonu
            fetch('/sync-progress', { method: 'POST' })
                .catch(() => console.log('[SW] Sync failed, will retry later'))
        );
    }
});

console.log('[SW] Service Worker loaded');

const CACHE_NAME = 'icewatch-v1';
const STATIC_ASSETS = [
  '/ice-watch/',
  '/ice-watch/index.html',
  '/ice-watch/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.log('Cache partial:', err));
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip API calls — always go to network
  if (event.request.url.includes('base44.app') || 
      event.request.url.includes('nominatim') ||
      event.request.url.includes('basemaps.cartocdn')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🚨 ICE Watch — Alerta Cercana';
  const options = {
    body: data.body || 'Se reportó actividad en tu área.',
    icon: '/ice-watch/icons/icon-192.png',
    badge: '/ice-watch/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/ice-watch/' },
    actions: [
      { action: 'view', title: 'Ver Mapa' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

const CACHE_NAME = 'smart-study-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/app.js',
  '/firebase.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/lucide-static@0.344.0/font/lucide.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

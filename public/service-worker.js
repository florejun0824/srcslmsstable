/*
  This is a basic service worker for caching static assets.
  It helps your app load offline and qualifies it for PWA installation.
*/

const CACHE_NAME = 'srcs-lms-cache-v1';
// Add paths to your static assets here.
// You MUST include the icons you listed in manifest.json
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png', // From your index.html
  '/logo.png', // From your index.html
  '/icons/icon-192.png', // From my manifest example
  '/icons/icon-512.png' // From my manifest example
];

// Install event: fires when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // We use addAll(urlsToCache) to fetch and cache all the assets.
        // If any fail, the entire service worker install fails.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        self.skipWaiting();
      })
  );
});

// Activate event: fires after install. Cleans up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: fires for every network request.
// This example uses a "cache-first" strategy.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response from cache
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});


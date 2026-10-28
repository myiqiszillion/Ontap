/**
 * NTMK Service Worker — PWA & Offline Caching Engine
 * Caching strategy: Network-First for app shell code (ensuring fresh UI), Cache-First for static offline fallback
 */

const CACHE_NAME = 'ntmk-cache-v6-unified-tools';

const STATIC_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.png',
  '/css/edtech-design-system.css',
  '/css/style.css',
  '/css/quiz.css',
  '/css/diagnostic.css',
  '/css/planner.css',
  '/css/checker.css',
  '/css/heritage-theme.css',
  '/css/mistakes.css',
  '/css/custom-exam.css',
  '/css/theme-focus.css',
  '/css/smart-importer.css',
  '/css/printable-exam.css',
  '/css/command-palette.css',
  '/css/result-view.css',
  '/css/icons.css',
  '/css/athenaeum-theme.css',
  '/js/icons.js',
  '/js/audio.js',
  '/js/api.js',
  '/js/state.js',
  '/js/router.js',
  '/js/onboarding.js',
  '/js/dashboard.js',
  '/js/subject-explorer.js',
  '/js/data-loader.js',
  '/js/formula-renderer.js',
  '/js/timer.js',
  '/js/study.js',
  '/js/question-schema.js',
  '/js/scoring-engine.js',
  '/js/quiz.js',
  '/js/checker.js',
  '/js/keyboard.js',
  '/js/mistakes.js',
  '/js/custom-exam.js',
  '/js/theme-focus.js',
  '/js/diagnostic-view.js',
  '/js/planner-view.js',
  '/js/auth-view.js',
  '/js/smart-importer.js',
  '/js/printable-exam.js',
  '/js/command-palette.js',
  '/js/confetti.js',
  '/js/result-card.js',
  '/js/app.js',
  '/api/subjects'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL).catch((err) => {
        console.warn('Pre-cache partially failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Network-First for navigation, JavaScript, and CSS to guarantee instant UI freshness
  const isAppCode = request.mode === 'navigate' ||
                    url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.css') ||
                    url.pathname === '/' ||
                    url.pathname === '/index.html';

  if (isAppCode) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match(request).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              if (request.mode === 'navigate') {
                return cache.match('/index.html');
              }
              return null;
            });
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for other static assets (images, fonts, offline data)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});

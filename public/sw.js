// Awaaz-e-Awam Department Portal Service Worker
// Security Boundary: Caches ONLY static application shell assets.
// STRICT PRIVACY RULE: Never caches Supabase REST endpoints, Auth APIs, JWT tokens, complaints data, or citizen PII.

const SHELL_CACHE_NAME = 'awaaz-dept-shell-v1';

const PRECACHE_ASSETS = [
  '/department',
  '/department/login',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/pwa-icon-maskable.svg',
  '/manifest.webmanifest',
];

// URLs and patterns that MUST NEVER be cached
const STRICT_EXCLUDE_PATTERNS = [
  /supabase\.co/,
  /\/auth\/v1\//,
  /\/rest\/v1\//,
  /\/functions\/v1\//,
  /\/storage\/v1\//,
  /awaaz_complaints_store/,
  /token/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => {
        // Precaching shell routes
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          // In dev/test environments, some synthetic assets may be generated on-the-fly
          console.warn('[PWA SW] Precache non-blocking warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== SHELL_CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. STRICT PRIVACY GUARD: Bypass Service Worker for any auth, Supabase, or API requests
  const isExcluded = STRICT_EXCLUDE_PATTERNS.some((pattern) => pattern.test(request.url));
  if (isExcluded || request.method !== 'GET' || request.headers.has('Authorization')) {
    // Network only — completely bypassed from cache
    return;
  }

  // 2. CITIZEN WEBSITE PROTECTION: Ensure service worker only handles /department and global static assets
  const isDepartmentRoute = url.pathname.startsWith('/department');
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.webmanifest');

  if (!isDepartmentRoute && !isStaticAsset) {
    // Let browser handle citizen portal or other routes without SW interference
    return;
  }

  // 3. Navigation Requests within /department (HTML App Shell)
  if (request.mode === 'navigate' && isDepartmentRoute) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful shell response
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback: Return cached department shell
          const cached = await caches.match(request);
          if (cached) return cached;

          const loginFallback = await caches.match('/department/login');
          if (loginFallback) return loginFallback;

          const rootFallback = await caches.match('/department');
          if (rootFallback) return rootFallback;

          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>Department Portal (Offline Shell)</title>
                <style>
                  body { background: #0A0D12; color: #FFFFFF; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                  .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; max-width: 480px; }
                  h1 { color: #D4AF37; margin: 0 0 12px 0; font-size: 24px; }
                  p { color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
                  button { background: #D4AF37; color: #000; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>APPLICATION SHELL OFFLINE</h1>
                  <p>Awaaz-e-Awam Department Portal application shell is loaded. An active internet connection is required to authenticate with Supabase and synchronize municipal complaints.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 4. Static Assets (JS, CSS, Icons): Stale-While-Revalidate
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(SHELL_CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});


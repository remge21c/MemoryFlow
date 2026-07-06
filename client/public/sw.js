// Memory Flow PWA 서비스 워커 — 설치 가능(installable) 요건 충족 + 오프라인 폴백.
// 정적 자산은 네트워크 우선(최신 유지), 실패 시 캐시. API/미디어는 항상 네트워크(인증·동적).
const CACHE = 'memoryflow-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 외부(폰트 CDN 등)는 관여 안 함
  if (url.pathname.startsWith('/api/')) return;     // API·미디어는 항상 네트워크

  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
  );
});

// 홈 화면 설치(A2HS)를 위한 최소 서비스워커.
// 캐싱은 하지 않는다 — 낡은 번들이 남아 디버깅이 어려워지는 쪽이 더 손해다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

// ─── バージョンはApp.jsxのAPP_VERSIONと合わせて更新する ──────────────────────
const CACHE_NAME = 'timeflow-v2.9.5';

const ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// インストール：必須アセットをキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API呼び出しはキャッシュしない（オフライン時はそのまま失敗させる）
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ error: 'オフライン中です' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    ));
    return;
  }

  // ページナビゲーション：キャッシュ優先 → なければネットワーク → なければ /index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(cached => {
        if (cached) {
          // バックグラウンドで最新を取得してキャッシュ更新
          fetch(e.request).then(res => {
            if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res));
          }).catch(() => {});
          return cached;
        }
        return fetch(e.request).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // その他のリソース：キャッシュ優先 → なければネットワーク取得してキャッシュ保存
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

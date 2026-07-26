const CACHE_NAME = 'timeflow-v2.10.6';

// インストール：最小限だけキャッシュ（ビルドファイル名は動的なので無理に指定しない）
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html', '/manifest.json']).catch(() => {})
    )
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

  // API・外部リクエストはキャッシュしない
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname
  ) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'オフライン中です' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ナビゲーション（アプリを開く）：キャッシュ優先
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(cached => {
        // バックグラウンドで更新（ネットワークがあれば）
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put('/index.html', res.clone()));
          }
          return res;
        }).catch(() => null);

        // キャッシュがあればすぐ返す、なければネットワーク待ち
        return cached || fetchPromise || caches.match('/index.html');
      })
    );
    return;
  }

  // JS/CSS/画像など：キャッシュ優先、なければ取得してキャッシュ保存
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(res => {
        // 有効なレスポンスのみキャッシュ
        if (!res || !res.ok || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => {
        // オフライン時：HTMLを返してSPAとして動かす
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 408 });
      });
    })
  );
});

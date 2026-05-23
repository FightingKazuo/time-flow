const CACHE = "timeflow-v1";

const PRECACHE = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/static/js/vendors~main.chunk.js",
  "/static/css/main.chunk.css",
];

// インストール時にキャッシュ
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // best-effort: 失敗してもインストールは続行
      return c.addAll(PRECACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 古いキャッシュ削除
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch: キャッシュ優先 → ネットワーク → キャッシュフォールバック
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 同一オリジンのみキャッシュ対象
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached); // オフライン時はキャッシュを返す

      // キャッシュがあれば即返し、バックグラウンドで更新
      return cached || fetchPromise;
    })
  );
});

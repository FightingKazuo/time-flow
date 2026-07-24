// ─── Google Identity Services 読み込みヘルパー ────────────────────────────────
// 複数モーダルが同時にGoogleスクリプトを読み込もうとする競合を防ぐため一元化

let loadPromise = null;

export function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // すでに<script>タグが存在する場合は読み込み待ちだけ行う
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("タイムアウト")); }, 8000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google APIの読み込みに失敗しました"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

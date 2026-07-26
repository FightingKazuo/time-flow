import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));

// App.jsx自体のimport（トップレベル処理含む）が失敗しても
// 真っ黒画面にならないよう、動的importでラップする
import('./App')
  .then((module) => {
    const App = module.default;
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('TimeFlow failed to load:', error);
    root.render(
      <div style={{
        minHeight: '100vh', background: '#0d0f14', color: '#e8ecf4',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, fontFamily: "'Noto Sans JP',sans-serif",
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>
          TimeFlowを読み込めませんでした
        </div>
        <div style={{
          fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.1)',
          border: '1px solid #f8717155', borderRadius: 8, padding: '10px 14px',
          marginBottom: 20, maxWidth: 480, wordBreak: 'break-word', textAlign: 'left',
        }}>
          {error?.message || String(error)}
        </div>
        <button
          onClick={() => {
            if (window.confirm('ローカルデータを削除してリセットしますか？')) {
              try { localStorage.clear(); } catch (e) {}
            }
            window.location.reload();
          }}
          style={{
            background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: 260,
          }}
        >
          🔄 リセットして再読み込み
        </button>
      </div>
    );
  });

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error("TimeFlow crashed:", error, info);
  }

  handleResetData = () => {
    if (window.confirm("ローカルデータを全て削除してリセットします。よろしいですか？\n（Googleドライブに保存済みのデータは消えません）")) {
      try {
        localStorage.clear();
      } catch (e) {}
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error);
      const stack = this.state.error?.stack || "";
      return (
        <div style={{
          minHeight: "100vh", background: "#0d0f14", color: "#e8ecf4",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: 24, fontFamily: "'Noto Sans JP',sans-serif",
          boxSizing: "border-box",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
            TimeFlowでエラーが発生しました
          </div>
          <div style={{
            fontSize: 12, color: "#f87171", background: "rgba(248,113,113,0.1)",
            border: "1px solid #f8717155", borderRadius: 8, padding: "10px 14px",
            marginBottom: 20, maxWidth: 480, wordBreak: "break-word", textAlign: "left",
          }}>
            {msg}
          </div>

          <button onClick={this.handleReload} style={{
            background: "#4f8ef7", color: "#fff", border: "none", borderRadius: 10,
            padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10, width: 260,
          }}>
            🔄 再読み込み
          </button>

          <button onClick={this.handleResetData} style={{
            background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid #f8717155",
            borderRadius: 10, padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: 260,
          }}>
            🗑 ローカルデータをリセット
          </button>

          <div style={{ fontSize: 10, color: "#6b7a99", marginTop: 24, maxWidth: 480, textAlign: "center", lineHeight: 1.6 }}>
            リセットしてもGoogleドライブに保存済みのバックアップは消えません。<br/>
            再読み込み後、設定からドライブのデータを読み込めます。
          </div>

          {stack && (
            <details style={{ marginTop: 20, maxWidth: 480, width: "100%" }}>
              <summary style={{ fontSize: 11, color: "#6b7a99", cursor: "pointer" }}>技術的な詳細を表示</summary>
              <pre style={{
                fontSize: 10, color: "#6b7a99", whiteSpace: "pre-wrap", wordBreak: "break-word",
                background: "#161920", padding: 10, borderRadius: 8, marginTop: 8, maxHeight: 200, overflow: "auto",
              }}>{stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

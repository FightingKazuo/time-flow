import { useState, useEffect } from "react";
import { BASE_FONT } from "../../constants";
import { DIARY_COLORS } from "./DiaryModal";

export default function DiaryAnalysisModal({ diaries, logs, studyCatId, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const muted  = t.muted  || "#3d4560";
  const accent = t.accent || "#4f8ef7";

  const [status,  setStatus]  = useState("idle"); // idle | loading | done | error
  const [report,  setReport]  = useState("");
  const [errMsg,  setErrMsg]  = useState("");

  // 直近1ヶ月の日記を抽出
  const getRecentDiaries = () => {
    const now  = new Date();
    const from = new Date(now); from.setMonth(from.getMonth() - 1);
    return Object.entries(diaries)
      .filter(([date, d]) => {
        const txt = typeof d === "object" ? d?.text : d;
        if(!txt?.trim()) return false;
        const dt = new Date(date.replace(/\//g, "-"));
        return dt >= from && dt <= now;
      })
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => {
        const txt   = typeof d === "object" ? d?.text  : d;
        const color = typeof d === "object" ? d?.color : "none";
        const dc    = DIARY_COLORS.find(c => c.id === color);
        // その日の勉強時間も付ける
        const dateKey = date.replace(/-/g, "/");
        const studySec = logs
          .filter(l => l.date === dateKey && l.catId === studyCatId)
          .reduce((s, l) => s + l.duration, 0);
        const studyMin = Math.round(studySec / 60);
        return { date, txt, colorLabel: dc?.id !== "none" ? dc?.label : null, studyMin };
      });
  };

  const entries = getRecentDiaries();

  // 統計サマリー
  const colorCounts = {};
  entries.forEach(e => {
    const key = e.colorLabel || "なし";
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  });
  const avgStudy = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.studyMin, 0) / entries.length)
    : 0;

  const analyze = async () => {
    if(entries.length === 0) {
      setErrMsg("直近1ヶ月の日記がありません。");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrMsg("");
    setReport("");

    const diaryText = entries.map(e =>
      `【${e.date}】${e.colorLabel ? `(${e.colorLabel}) ` : ""}勉強${e.studyMin}分\n${e.txt}`
    ).join("\n\n");

    const prompt = `以下はユーザーの直近1ヶ月の日記です（勉強時間付き）。

${diaryText}

---

以下の観点で分析してレポートを書いてください：

1. **全体の傾向・テーマ**：よく出てくる話題やキーワード
2. **感情・モチベーションの波**：ポジティブ/ネガティブな時期とその特徴
3. **勉強との相関**：気分と勉強時間の関係性
4. **良かった点**：この1ヶ月で成長・継続できたこと
5. **改善のヒント**：日記から読み取れる課題や提案
6. **一言メッセージ**：ユーザーへの励ましやアドバイス

日本語で、フレンドリーかつ具体的に書いてください。`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const result = data.content?.map(b => b.text || "").join("") || "";
      setReport(result);
      setStatus("done");
    } catch(e) {
      if(!navigator.onLine) {
        setErrMsg("オフライン中のため分析できません。インターネット接続を確認してください。");
      } else {
        setErrMsg("分析に失敗しました: " + e.message);
      }
      setStatus("error");
    }
  };

  // Markdown風の簡易レンダリング
  const renderReport = (text) => {
    return text.split("\n").map((line, i) => {
      if(line.startsWith("## ") || line.startsWith("# ")) {
        return <div key={i} style={{fontSize:BASE_FONT,fontWeight:800,color:accent,marginTop:16,marginBottom:6}}>{line.replace(/^#+\s/,"")}</div>;
      }
      if(line.startsWith("**") && line.endsWith("**")) {
        return <div key={i} style={{fontSize:BASE_FONT-1,fontWeight:700,color:text,marginTop:12,marginBottom:4}}>{line.replace(/\*\*/g,"")}</div>;
      }
      // **太字** をインラインで処理
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((p, j) =>
        j % 2 === 1
          ? <span key={j} style={{fontWeight:700,color:text}}>{p}</span>
          : p
      );
      if(line.startsWith("- ") || line.startsWith("・")) {
        return <div key={i} style={{fontSize:BASE_FONT-2,color:text,lineHeight:1.7,paddingLeft:12,marginBottom:2}}>• {rendered.join ? rendered : line.slice(2)}</div>;
      }
      if(line.trim() === "") return <div key={i} style={{height:6}}/>;
      return <div key={i} style={{fontSize:BASE_FONT-2,color:text,lineHeight:1.7,marginBottom:2}}>{rendered}</div>;
    });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:20,width:"100%",maxWidth:480,maxHeight:"90vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>

        {/* ヘッダー */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:BASE_FONT+2,fontWeight:800,color:text}}>📔 日記分析レポート</div>
            <div style={{fontSize:11,color:sub}}>直近1ヶ月 · {entries.length}件の日記</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:sub,fontSize:22,cursor:"pointer"}}>×</button>
        </div>

        {/* サマリー統計 */}
        <div style={{background:card2,borderRadius:10,padding:12,marginBottom:12,border:`1px solid ${border}`}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:22,fontWeight:800,color:accent}}>{entries.length}</div>
              <div style={{fontSize:10,color:sub}}>日記数</div>
            </div>
            <div style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:22,fontWeight:800,color:"#34d399"}}>{avgStudy}分</div>
              <div style={{fontSize:10,color:sub}}>平均勉強時間</div>
            </div>
            {Object.entries(colorCounts).slice(0,2).map(([label,cnt])=>(
              <div key={label} style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:22,fontWeight:800,color:"#fbbf24"}}>{cnt}</div>
                <div style={{fontSize:10,color:sub}}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 分析ボタン */}
        {status === "idle" && (
          <button onClick={analyze} style={{width:"100%",background:accent,border:"none",borderRadius:12,padding:"14px 0",color:"#fff",fontWeight:800,fontSize:BASE_FONT,cursor:"pointer",marginBottom:12}}>
            ✨ AIで分析する
          </button>
        )}

        {/* ローディング */}
        {status === "loading" && (
          <div style={{textAlign:"center",padding:"32px 0",color:sub}}>
            <div style={{fontSize:32,marginBottom:12,animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</div>
            <div style={{fontSize:BASE_FONT-1,fontWeight:700}}>Claudeが分析中...</div>
            <div style={{fontSize:11,color:muted,marginTop:4}}>日記{entries.length}件を読んでいます</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* エラー */}
        {status === "error" && (
          <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",borderRadius:10,padding:14,marginBottom:12,color:"#f87171",fontSize:BASE_FONT-2}}>
            ⚠ {errMsg}
          </div>
        )}

        {/* レポート */}
        {status === "done" && report && (
          <>
            <div style={{overflowY:"auto",flex:1,paddingRight:4}}>
              <div style={{background:card2,borderRadius:10,padding:14,border:`1px solid ${border}`}}>
                {renderReport(report)}
              </div>
            </div>
            <button onClick={analyze} style={{marginTop:10,background:"none",border:`1px solid ${border}`,borderRadius:10,padding:"10px 0",color:sub,cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700,width:"100%"}}>
              🔄 再分析する
            </button>
          </>
        )}

        <button onClick={onClose} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:8,width:"100%"}}>閉じる</button>
      </div>
    </div>
  );
}

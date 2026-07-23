import { useState, useRef } from "react";
import { BASE_FONT, fmtHM } from "../../constants";

export default function BackupModal({ data, onRestore, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const accent = t.accent || "#4f8ef7";

  const [mode,     setMode]     = useState("menu");
  const [msg,      setMsg]      = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const jsonStr = JSON.stringify(data,null,2);

  const bS = (bg, fg="#fff") => ({background:bg,color:fg,border:"none",borderRadius:10,padding:"14px 0",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT,width:"100%",marginBottom:8,display:"block"});

  const handleFile = (file) => {
    if(!file) return;
    if(!file.name.endsWith(".json") && file.type !== "application/json") {
      setMsg({ok:false,text:"JSONファイルを選択してください"}); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const p = JSON.parse(e.target.result);
        if(!p.categories||!p.logs) throw new Error("形式が正しくありません");
        onRestore(p);
        setMsg({ok:true,text:"復元しました！"});
        setTimeout(onClose, 1400);
      } catch(err) {
        setMsg({ok:false,text:"エラー: "+err.message});
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:BASE_FONT+3,fontWeight:800,color:text}}>💾 バックアップ</div>
            <div style={{fontSize:10,color:sub}}>{(new Blob([jsonStr]).size/1024).toFixed(1)} KB</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:sub,fontSize:22,cursor:"pointer"}}>×</button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {[
            {label:"記録",       val:data.logs?.length||0,        color:accent},
            {label:"日記",       val:Object.keys(data.diaries||{}).filter(k=>data.diaries[k]?.trim()).length, color:"#fbbf24"},
            {label:"カテゴリー", val:data.categories?.length||0,  color:"#34d399"},
            {label:"長期タスク", val:data.longTermTasks?.length||0,color:"#fb923c"},
            {label:"週間履歴",   val:data.weekHistory?.length||0,  color:"#a78bfa"},
          ].map(s=>(
            <div key={s.label} style={{flex:"1 1 60px",background:card2,borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${border}`}}>
              <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
              <div style={{fontSize:9,color:sub}}>{s.label}</div>
            </div>
          ))}
        </div>

        {msg&&<div style={{background:msg.ok?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)",border:`1px solid ${msg.ok?"#34d399":"#f87171"}`,borderRadius:8,padding:10,marginBottom:12,fontSize:BASE_FONT-1,color:msg.ok?"#34d399":"#f87171",fontWeight:600,textAlign:"center"}}>{msg.ok?"✓ ":"⚠ "}{msg.text}</div>}

        {mode==="menu"&&(
          <>
            <button style={bS(accent)}    onClick={()=>setMode("export")}>📤 バックアップを書き出す</button>
            <button style={bS(card2, sub)} onClick={()=>setMode("import")}>📥 ファイルから復元する</button>
          </>
        )}

        {mode==="export"&&(
          <>
            <button style={bS(accent)} onClick={()=>{
              // iOS対応: data: URLを使用（createObjectURLはiOSでホワイトアウトを引き起こす）
              const dataUrl = "data:application/json;charset=utf-8," + encodeURIComponent(jsonStr);
              const dlLink = document.createElement("a");
              dlLink.href = dataUrl;
              dlLink.download = `timeflow_${new Date().toISOString().slice(0,10)}.json`;
              document.body.appendChild(dlLink);
              dlLink.click();
              setTimeout(() => document.body.removeChild(dlLink), 100);
              setMsg({ok:true,text:"ファイルを保存しました！"});
            }}>📄 JSONファイルとして保存</button>
            <button style={bS(card2, sub)} onClick={()=>
              navigator.clipboard.writeText(jsonStr)
                .then(()=>setMsg({ok:true,text:"コピーしました！"}))
                .catch(()=>setMsg({ok:false,text:"コピー失敗"}))
            }>📋 クリップボードにコピー</button>
            <button style={{...bS(card2, sub),border:`1px solid ${border}`}} onClick={()=>setMode("menu")}>← 戻る</button>
          </>
        )}

        {mode==="import"&&(
          <>
            <input ref={fileRef} type="file" accept=".json,application/json" style={{display:"none"}}
              onChange={e=>handleFile(e.target.files[0])}/>
            <div
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
              style={{
                border:`2px dashed ${dragging?accent:border}`,
                borderRadius:12,padding:"32px 16px",textAlign:"center",
                cursor:"pointer",marginBottom:12,
                background:dragging?`rgba(79,142,247,0.08)`:card2,
                transition:"all 0.2s",
              }}>
              <div style={{fontSize:36,marginBottom:8}}>📂</div>
              <div style={{fontSize:BASE_FONT,fontWeight:700,color:text,marginBottom:4}}>タップしてファイルを選択</div>
              <div style={{fontSize:BASE_FONT-3,color:sub}}>timeflow_YYYY-MM-DD.json</div>
            </div>
            <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:BASE_FONT-3,color:"#f87171"}}>
              ⚠ 復元すると現在のデータが上書きされます
            </div>
            <button style={{...bS(card2, sub),border:`1px solid ${border}`}} onClick={()=>setMode("menu")}>← 戻る</button>
          </>
        )}
      </div>
    </div>
  );
}

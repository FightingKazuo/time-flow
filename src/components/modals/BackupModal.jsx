import { useState, useRef, useEffect } from "react";
import { BASE_FONT, DAYS_LABEL, PRESET_COLORS, WEEKLY_DEFAULTS, todayStr, dayDateStr, hexRgb, fmtHM, fmtHMS, pad } from "../../constants";

export default function BackupModal({ data, onRestore, onClose }) {
  const [mode,setMode]=useState("menu");
  const [msg,setMsg]=useState(null);
  const [dragging,setDragging]=useState(false);
  const fileRef=useRef(null);
  const jsonStr=JSON.stringify(data,null,2);

  const bS=(bg,fg="#fff")=>({background:bg,color:fg,border:"none",borderRadius:10,padding:"14px 0",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT,width:"100%",marginBottom:8,display:"block"});

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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:BASE_FONT+3,fontWeight:800}}>💾 バックアップ</div>
            <div style={{fontSize:10,color:"#6b7a99"}}>{(new Blob([jsonStr]).size/1024).toFixed(1)} KB</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        {/* Stats */}
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {[
            {label:"記録",      val:data.logs?.length||0,        color:"#4f9eff"},
            {label:"日記",      val:Object.keys(data.diaries||{}).filter(k=>data.diaries[k]?.trim()).length, color:"#fbbf24"},
            {label:"カテゴリー", val:data.categories?.length||0,  color:"#34d399"},
            {label:"長期タスク", val:data.longTermTasks?.length||0,color:"#fb923c"},
            {label:"週間履歴",  val:data.weekHistory?.length||0,  color:"#a78bfa"},
          ].map(s=>(
            <div key={s.label} style={{flex:"1 1 60px",background:"#161920",borderRadius:8,padding:"8px 6px",textAlign:"center",border:"1px solid #2a2f3d"}}>
              <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
              <div style={{fontSize:9,color:"#6b7a99"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Message */}
        {msg&&<div style={{background:msg.ok?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)",border:`1px solid ${msg.ok?"#34d399":"#f87171"}`,borderRadius:8,padding:10,marginBottom:12,fontSize:BASE_FONT-1,color:msg.ok?"#34d399":"#f87171",fontWeight:600,textAlign:"center"}}>{msg.ok?"✓ ":"⚠ "}{msg.text}</div>}

        {mode==="menu"&&(
          <>
            <button style={bS("#4f9eff")} onClick={()=>setMode("export")}>📤 バックアップを書き出す</button>
            <button style={bS("#2a2f3d")} onClick={()=>setMode("import")}>📥 ファイルから復元する</button>
          </>
        )}

        {mode==="export"&&(
          <>
            <button style={bS("#4f9eff")} onClick={()=>{
              const a=document.createElement("a");
              a.href=URL.createObjectURL(new Blob([jsonStr],{type:"application/json"}));
              a.download=`timeflow_${new Date().toISOString().slice(0,10)}.json`;
              a.click();
              setMsg({ok:true,text:"ファイルを保存しました！"});
            }}>📄 JSONファイルとして保存</button>
            <button style={bS("#2a2f3d")} onClick={()=>
              navigator.clipboard.writeText(jsonStr)
                .then(()=>setMsg({ok:true,text:"コピーしました！"}))
                .catch(()=>setMsg({ok:false,text:"コピー失敗"}))
            }>📋 クリップボードにコピー</button>
            <button style={{...bS("#161920","#6b7a99"),border:"1px solid #2a2f3d"}} onClick={()=>setMode("menu")}>← 戻る</button>
          </>
        )}

        {mode==="import"&&(
          <>
            {/* File drop zone */}
            <input ref={fileRef} type="file" accept=".json,application/json" style={{display:"none"}}
              onChange={e=>handleFile(e.target.files[0])}/>
            <div
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
              style={{
                border:`2px dashed ${dragging?"#4f9eff":"#2a2f3d"}`,
                borderRadius:12, padding:"32px 16px", textAlign:"center",
                cursor:"pointer", marginBottom:12,
                background:dragging?"rgba(79,158,255,0.08)":"#161920",
                transition:"all 0.2s",
              }}>
              <div style={{fontSize:36,marginBottom:8}}>📂</div>
              <div style={{fontSize:BASE_FONT,fontWeight:700,color:"#e8ecf4",marginBottom:4}}>
                タップしてファイルを選択
              </div>
              <div style={{fontSize:BASE_FONT-3,color:"#6b7a99"}}>
                timeflow_YYYY-MM-DD.json
              </div>
            </div>

            <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:BASE_FONT-3,color:"#f87171"}}>
              ⚠ 復元すると現在のデータが上書きされます
            </div>
            <button style={{...bS("#161920","#6b7a99"),border:"1px solid #2a2f3d"}} onClick={()=>setMode("menu")}>← 戻る</button>
          </>
        )}
      </div>
    </div>
  );
}



import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────
const DEFAULT_CATS = [
  { id:"study",    name:"勉強",   color:"#4f9eff" },
  { id:"work",     name:"仕事",   color:"#a78bfa" },
  { id:"house",    name:"家事",   color:"#34d399" },
  { id:"exercise", name:"運動",   color:"#fb923c" },
  { id:"other",    name:"その他", color:"#94a3b8" },
];
const PRESET_COLORS = ["#4f9eff","#a78bfa","#34d399","#fb923c","#f87171","#fbbf24","#e879f9","#2dd4bf","#f472b6","#94a3b8"];
const DAYS_LABEL = ["月","火","水","木","金","土日"];

const pad = n => String(n).padStart(2,"0");
const fmtTime = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
const fmtHM = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h&&m?`${h}h${m}m`:h?`${h}h`:`${m}m`; };
const fmtDate = d => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
const todayStr = () => fmtDate(new Date());
const hexRgb = h => { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return `${r},${g},${b}`; };
const isMobile = () => window.innerWidth < 640;

const getWeekMonday = () => {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() + (day===0?-6:1-day)); d.setHours(0,0,0,0); return d;
};
const getDayDate = idx => {
  const mon = getWeekMonday();
  mon.setDate(mon.getDate() + (idx===5?5:idx)); return mon;
};
const dayDateStr = idx => { const d=getDayDate(idx); return `${d.getMonth()+1}/${d.getDate()}`; };
const todayDayIdx = () => { const d=new Date().getDay(); return (d===0||d===6)?5:d-1; };

const WEEKLY_DEFAULTS = [
  { label:"英語単語", days:[0,1,2,3,4] },
  { label:"読書",     days:[0,1,2,3,4,5] },
];
const buildWeeklyTasks = tpls => Object.fromEntries(
  DAYS_LABEL.map((_,i)=>[i, tpls.filter(t=>t.days.includes(i)).map(t=>({id:`w_${t.label}_${i}`,label:t.label,done:false,weekly:true}))])
);

// ─── localStorage helpers ────────────────────────────────────────────────────
const LS = {
  get: (key, def) => { try { const v=localStorage.getItem(key); return v?JSON.parse(v):def; } catch{ return def; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch{} },
};

function notify(title, body) {
  if("Notification" in window && Notification.permission==="granted") new Notification(title,{body});
}

// ─── Backup Modal ─────────────────────────────────────────────────────────────
function BackupModal({ data, onRestore, onClose }) {
  const [mode, setMode] = useState("menu");
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState(null);
  const jsonStr = JSON.stringify(data, null, 2);
  const dataSize = (new Blob([jsonStr]).size/1024).toFixed(1);
  const handleExport = () => {
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([jsonStr],{type:"application/json"}));
    a.download=`timeflow_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setMsg({ok:true,text:"バックアップファイルを書き出しました！"});
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr).then(()=>setMsg({ok:true,text:"JSONをコピーしました！"})).catch(()=>setMsg({ok:false,text:"コピーに失敗しました"}));
  };
  const handleImport = () => {
    try {
      const p=JSON.parse(importText);
      if(!p.categories||!p.logs||!p.diaries) throw new Error("データ形式が正しくありません");
      onRestore(p); setMsg({ok:true,text:"データを復元しました！"}); setTimeout(onClose,1200);
    } catch(e){ setMsg({ok:false,text:"エラー: "+e.message}); }
  };
  const bS=(bg,fg="#fff")=>({background:bg,color:fg,border:"none",borderRadius:10,padding:"12px 0",fontWeight:700,cursor:"pointer",fontSize:13,width:"100%",marginBottom:8});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:16,fontWeight:800}}>💾 バックアップ</div><div style={{fontSize:10,color:"#6b7a99"}}>{dataSize} KB</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[{l:"記録",v:data.logs?.length||0,u:"件",c:"#4f9eff"},{l:"日記",v:Object.keys(data.diaries||{}).filter(k=>data.diaries[k]?.trim()).length,u:"件",c:"#fbbf24"},{l:"カテゴリー",v:data.categories?.length||0,u:"個",c:"#34d399"}].map(s=>(
            <div key={s.l} style={{flex:1,background:"#161920",borderRadius:10,padding:"10px 8px",textAlign:"center",border:"1px solid #2a2f3d"}}>
              <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}<span style={{fontSize:11}}>{s.u}</span></div>
              <div style={{fontSize:10,color:"#6b7a99",marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
        {msg&&<div style={{background:msg.ok?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)",border:`1px solid ${msg.ok?"#34d399":"#f87171"}`,borderRadius:8,padding:"10px",marginBottom:12,fontSize:12,color:msg.ok?"#34d399":"#f87171",fontWeight:600,textAlign:"center"}}>{msg.ok?"✓ ":"⚠ "}{msg.text}</div>}
        {mode==="menu"&&<><button style={bS("#4f9eff")} onClick={()=>setMode("export")}>📤 バックアップを書き出す</button><button style={bS("#2a2f3d")} onClick={()=>setMode("import")}>📥 バックアップから復元する</button></>}
        {mode==="export"&&<><button style={bS("#4f9eff")} onClick={handleExport}>📄 JSONファイルとして保存</button><button style={bS("#2a2f3d")} onClick={handleCopy}>📋 JSONをクリップボードにコピー</button><button style={{...bS("#161920","#6b7a99"),border:"1px solid #2a2f3d"}} onClick={()=>setMode("menu")}>← 戻る</button></>}
        {mode==="import"&&<><div style={{fontSize:12,color:"#6b7a99",marginBottom:8}}>バックアップのJSONを貼り付けてください</div><textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder='{"categories":[...],"logs":[...],...}' style={{width:"100%",boxSizing:"border-box",height:120,background:"#161920",border:"1px solid #2a2f3d",borderRadius:10,padding:12,color:"#e8ecf4",fontSize:11,resize:"none",outline:"none",fontFamily:"monospace",marginBottom:8}}/><div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#f87171"}}>⚠ 復元すると現在のデータが上書きされます</div><button style={bS("#f87171")} onClick={handleImport}>復元する</button><button style={{...bS("#161920","#6b7a99"),border:"1px solid #2a2f3d"}} onClick={()=>setMode("menu")}>← 戻る</button></>}
      </div>
    </div>
  );
}

// ─── Ring Timer ─────────────────────────────────────────────────────────────
function RingTimer({ elapsed, total, running, color }) {
  const r=88, circ=2*Math.PI*r;
  const prog = total>0 ? Math.min(elapsed/total,1) : (elapsed%3600)/3600;
  const dash = circ*(1-prog);
  const rc = total>0 ? (prog<0.6?"#34d399":prog<0.85?"#fb923c":"#f87171") : color;
  const dm = total>0?pad(Math.floor((total-elapsed)/60)):pad(Math.floor((elapsed%3600)/60));
  const ds = total>0?pad((total-elapsed)%60):pad(elapsed%60);
  const dh = total===0?pad(Math.floor(elapsed/3600)):null;
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="cg"><stop offset="0%" stopColor={rc} stopOpacity="0.1"/><stop offset="100%" stopColor={rc} stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx="110" cy="110" r="100" fill="url(#cg)"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke="#1e2330" strokeWidth="14"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke={rc} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash} transform="rotate(-90 110 110)"
        filter="url(#glow)" style={{transition:"stroke-dashoffset 1s linear,stroke 0.5s"}}/>
      {prog>0.01&&<circle cx={110+r*Math.cos(2*Math.PI*prog-Math.PI/2)} cy={110+r*Math.sin(2*Math.PI*prog-Math.PI/2)} r="7" fill={rc} filter="url(#glow)"/>}
      {dh&&<text x="110" y="95" textAnchor="middle" fill="#6b7a99" fontSize="13" fontFamily="monospace">{dh}h</text>}
      <text x="110" y={dh?"122":"116"} textAnchor="middle" fill="#e8ecf4" fontSize={dh?"30":"36"} fontWeight="800" fontFamily="monospace">{dm}:{ds}</text>
      <text x="110" y="140" textAnchor="middle" fill={running?rc:"#3d4560"} fontSize="11" fontFamily="monospace" fontWeight="600">{running?"● REC":"⏸ PAUSE"}</text>
    </svg>
  );
}

// ─── 24h Bar ─────────────────────────────────────────────────────────────────
function Bar24h({ logs, categories, date }) {
  const catMap = Object.fromEntries(categories.map(c=>[c.id,c]));
  const byCat = {};
  logs.filter(l=>l.date===date).forEach(l=>{ byCat[l.catId]=(byCat[l.catId]||0)+l.duration; });
  const segs = Object.entries(byCat).map(([id,dur])=>({id,dur,color:catMap[id]?.color||"#6b7a99",name:catMap[id]?.name||id}));
  const total = segs.reduce((s,x)=>s+x.dur,0);
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:10,color:"#6b7a99",fontWeight:700}}>今日の24時間</span>
        <span style={{fontSize:10,color:"#6b7a99"}}>{fmtHM(total)||"0m"} / 24h</span>
      </div>
      <div style={{height:12,borderRadius:6,background:"#161920",overflow:"hidden",display:"flex",border:"1px solid #2a2f3d"}}>
        {segs.map((s,i)=><div key={i} title={`${s.name}: ${fmtHM(s.dur)}`} style={{width:`${(s.dur/86400)*100}%`,background:s.color,minWidth:s.dur>60?2:0}}/>)}
      </div>
      {segs.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px",marginTop:5}}>
          {segs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:2,background:s.color}}/><span style={{fontSize:10,color:"#94a3b8"}}>{s.name} {fmtHM(s.dur)}</span></div>)}
        </div>
      )}
    </div>
  );
}

// ─── Category Dial ────────────────────────────────────────────────────────────
function CategoryDial({ categories, selected, onSelect, disabled }) {
  const ref = useRef(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const idx=categories.findIndex(c=>c.id===selected);
    el.scrollLeft=idx*82-el.clientWidth/2+41;
  },[selected,categories]);
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,color:"#6b7a99",fontWeight:700,marginBottom:6,textAlign:"center"}}>カテゴリー</div>
      <div ref={ref} style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 12px 6px",scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
        {categories.map(c=>{
          const a=selected===c.id;
          return <div key={c.id} onClick={()=>!disabled&&onSelect(c.id)} style={{scrollSnapAlign:"center",flexShrink:0,width:66,padding:"8px 4px",borderRadius:10,border:`2px solid ${a?c.color:"#2a2f3d"}`,background:a?`rgba(${hexRgb(c.color)},0.18)`:"#161920",cursor:disabled?"not-allowed":"pointer",textAlign:"center",transition:"all 0.2s",transform:a?"scale(1.06)":"scale(1)",opacity:disabled&&!a?0.4:1}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:c.color,margin:"0 auto 4px",boxShadow:a?`0 0 10px ${c.color}88`:"none"}}/>
            <div style={{fontSize:10,fontWeight:700,color:a?c.color:"#6b7a99"}}>{c.name}</div>
          </div>;
        })}
      </div>
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  return <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
    {PRESET_COLORS.map(c=><div key={c} onClick={()=>onChange(c)} style={{width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",border:value===c?"3px solid #fff":"3px solid transparent",boxSizing:"border-box"}}/>)}
  </div>;
}

// ─── TaskInput（iOS二重入力バグ修正：refで非制御入力）────────────────────────
function TaskInput({ onAdd, onCancel, inputStyle, btnStyle }) {
  const ref = useRef(null);
  const submit = () => {
    const val = ref.current?.value || "";
    if(val.trim()) onAdd(val.trim());
    else onCancel();
  };
  return (
    <div style={{display:"flex",gap:4,marginTop:6}}>
      <input
        ref={ref}
        autoFocus
        style={inputStyle}
        placeholder="タスク名"
        defaultValue=""
        onKeyDown={e=>{ if(e.key==="Enter") submit(); if(e.key==="Escape") onCancel(); }}
      />
      <button style={{...btnStyle(),padding:"5px 8px",fontSize:11}} onClick={submit}>✓</button>
      <button style={{...btnStyle("#2a2f3d"),padding:"5px 8px",fontSize:11}} onClick={onCancel}>✕</button>
    </div>
  );
}

// ─── Move Task Popup ──────────────────────────────────────────────────────────
function MoveTaskPopup({ task, fromDay, onMove, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>タスクを移動</div>
        <div style={{fontSize:12,color:"#6b7a99",marginBottom:16}}>「{task.label}」をどの曜日に移動しますか？</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {DAYS_LABEL.map((d,i)=>(
            <button key={i} disabled={i===fromDay} onClick={()=>onMove(i)} style={{padding:"12px 8px",borderRadius:10,border:`1px solid ${i===fromDay?"#3d4560":"#2a2f3d"}`,background:i===fromDay?"#161920":"#2a2f3d",color:i===fromDay?"#3d4560":"#e8ecf4",cursor:i===fromDay?"not-allowed":"pointer",fontWeight:700,fontSize:13,transition:"background 0.2s"}}>
              <div style={{fontSize:10,color:"#6b7a99",marginBottom:2}}>{dayDateStr(i)}</div>
              {d}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{width:"100%",marginTop:12,background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:12}}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── Diary Modal ──────────────────────────────────────────────────────────────
function DiaryModal({ date, diary, onSave, onClose }) {
  const [text, setText] = useState(diary||"");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,paddingBottom:32}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:15,fontWeight:800}}>📔 日記</div>
            <div style={{fontSize:11,color:"#fbbf24"}}>{date}</div>
          </div>
          <button onClick={()=>{onSave(text);onClose();}} style={{background:"#4f9eff",border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>保存</button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="今日のことを書いておこう..."
          style={{width:"100%",boxSizing:"border-box",height:220,background:"#161920",border:"1px solid #2a2f3d",borderRadius:10,padding:14,color:"#e8ecf4",fontSize:14,resize:"none",outline:"none",lineHeight:1.8,fontFamily:"inherit"}}
          autoFocus/>
        <button onClick={onClose} style={{marginTop:10,background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:12,width:"100%"}}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── Diary List Modal ─────────────────────────────────────────────────────────
function DiaryListModal({ diaries, onOpen, onClose }) {
  const entries = Object.entries(diaries).filter(([,v])=>v.trim()).sort(([a],[b])=>b.localeCompare(a));
  const [search, setSearch] = useState("");
  const filtered = search ? entries.filter(([d,t])=>d.includes(search)||t.includes(search)) : entries;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:800}}>📔 日記一覧</div>
          <div style={{fontSize:11,color:"#6b7a99"}}>{entries.length}件</div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索..." style={{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 12px",color:"#e8ecf4",fontSize:12,outline:"none",marginBottom:12}}/>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:24,fontSize:13}}>日記がありません</div>}
          {filtered.map(([date,text])=>(
            <div key={date} onClick={()=>onOpen(date)} style={{background:"#161920",borderRadius:10,border:"1px solid #2a2f3d",padding:"12px 14px",marginBottom:8,cursor:"pointer"}}>
              <div style={{fontSize:11,color:"#fbbf24",fontWeight:700,marginBottom:4}}>{date}</div>
              <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6,whiteSpace:"pre-wrap",overflow:"hidden",maxHeight:60,WebkitLineClamp:3,display:"-webkit-box",WebkitBoxOrient:"vertical"}}>
                {text}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:12,paddingTop:10}}>閉じる</button>
      </div>
    </div>
  );
}

// ─── Edit Log Modal ───────────────────────────────────────────────────────────
function EditLogModal({ log, categories, onSave, onClose }) {
  const [dur, setDur] = useState(Math.floor(log.duration/60));
  const [label, setLabel] = useState(log.label);
  const [catId, setCatId] = useState(log.catId);
  const iS={background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"8px 12px",color:"#e8ecf4",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:16,border:"1px solid #2a2f3d",padding:24,width:320,maxWidth:"90vw"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:800,marginBottom:16}}>記録を編集</div>
        <div style={{fontSize:11,color:"#6b7a99",marginBottom:4}}>内容</div>
        <input style={iS} value={label} onChange={e=>setLabel(e.target.value)}/>
        <div style={{fontSize:11,color:"#6b7a99",margin:"12px 0 4px"}}>時間（分）</div>
        <input style={iS} type="number" min="1" value={dur} onChange={e=>setDur(Number(e.target.value))}/>
        <div style={{fontSize:11,color:"#6b7a99",margin:"12px 0 6px"}}>カテゴリー</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {categories.map(c=><div key={c.id} onClick={()=>setCatId(c.id)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,border:`2px solid ${catId===c.id?c.color:"#2a2f3d"}`,background:catId===c.id?`rgba(${hexRgb(c.color)},0.2)`:"transparent",color:catId===c.id?c.color:"#6b7a99",cursor:"pointer"}}>{c.name}</div>)}
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#2a2f3d",color:"#fff",fontWeight:700,cursor:"pointer"}} onClick={onClose}>キャンセル</button>
          <button style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"#4f9eff",color:"#fff",fontWeight:700,cursor:"pointer"}} onClick={()=>onSave({...log,label,catId,duration:dur*60})}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cat Manager ─────────────────────────────────────────────────────────────
function CatManagerModal({ categories, onChange, onClose }) {
  const [cats,setCats]=useState(categories.map(c=>({...c})));
  const [newName,setNewName]=useState(""); const [newColor,setNewColor]=useState(PRESET_COLORS[0]); const [editing,setEditing]=useState(null);
  const iS={background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"8px 10px",color:"#e8ecf4",fontSize:12,outline:"none",flex:1};
  const bS=bg=>({padding:"7px 12px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11});
  const add=()=>{ if(!newName.trim()) return; setCats(p=>[...p,{id:Date.now().toString(),name:newName.trim(),color:newColor}]); setNewName(""); };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:15,fontWeight:800}}>カテゴリー管理</span>
          <button style={bS("#4f9eff")} onClick={()=>{onChange(cats);onClose();}}>完了</button>
        </div>
        {cats.map(c=>(
          <div key={c.id} style={{marginBottom:8,background:"#161920",borderRadius:10,padding:10,border:"1px solid #2a2f3d"}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <input style={{...iS,flex:1}} value={c.name} onChange={e=>setCats(p=>p.map(x=>x.id===c.id?{...x,name:e.target.value}:x))}/>
              <button style={{...bS(editing===c.id?"#4f9eff":"#2a2f3d"),padding:"6px 8px"}} onClick={()=>setEditing(editing===c.id?null:c.id)}>🎨</button>
              <button style={{...bS("#f87171"),padding:"6px 8px"}} onClick={()=>setCats(p=>p.filter(x=>x.id!==c.id))}>✕</button>
            </div>
            {editing===c.id&&<ColorPicker value={c.color} onChange={col=>setCats(p=>p.map(x=>x.id===c.id?{...x,color:col}:x))}/>}
          </div>
        ))}
        <div style={{marginTop:10,background:"#161920",borderRadius:10,padding:12,border:"1px dashed #2a2f3d"}}>
          <div style={{fontSize:11,color:"#6b7a99",marginBottom:6}}>新しいカテゴリー</div>
          <div style={{display:"flex",gap:6}}>
            <input style={iS} placeholder="名前" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
            <button style={bS("#34d399")} onClick={add}>追加</button>
          </div>
          <ColorPicker value={newColor} onChange={setNewColor}/>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Progress ──────────────────────────────────────────────────────────
function WeeklyProgress({ weeklyTasks, customTasks, logs, diaries, goalHours }) {
  const days = DAYS_LABEL.map((_,i)=>{ const wt=weeklyTasks[i]||[],ct=customTasks[i]||[],all=[...wt,...ct]; return {day:DAYS_LABEL[i],total:all.length,done:all.filter(t=>t.done).length}; });
  const totalT=days.reduce((s,d)=>s+d.total,0), doneT=days.reduce((s,d)=>s+d.done,0);
  const taskPct=totalT>0?Math.round(doneT/totalT*100):0;
  const weekTotal=logs.reduce((s,l)=>s+l.duration,0);
  const timePct=goalHours>0?Math.min(Math.round(weekTotal/goalHours/3600*100),100):0;
  const todayTotal=logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);
  // Diary score this week
  const mon=getWeekMonday();
  let diaryCount=0;
  for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(d.getDate()+i);const ds=fmtDate(d);if(diaries[ds]?.trim())diaryCount++;}
  const diaryPct=Math.round(diaryCount/7*100);

  const Ring=({pct,color,label,sub,size=56})=>{
    const r=20,c=2*Math.PI*r,d=c*(1-pct/100);
    return <div style={{textAlign:"center"}}>
      <svg width={size} height={size} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#2a2f3d" strokeWidth="5"/>
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={d} transform="rotate(-90 24 24)" style={{transition:"stroke-dashoffset 0.6s"}}/>
        <text x="24" y="28" textAnchor="middle" fill={color} fontSize="10" fontWeight="800" fontFamily="monospace">{pct}%</text>
      </svg>
      <div style={{fontSize:10,fontWeight:700,color:"#e8ecf4",marginTop:2}}>{label}</div>
      <div style={{fontSize:9,color:"#6b7a99"}}>{sub}</div>
    </div>;
  };

  return (
    <div style={{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:14,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:800,marginBottom:12}}>📈 今週の進捗</div>
      <div style={{display:"flex",justifyContent:"space-around",marginBottom:14}}>
        <Ring pct={taskPct} color="#4f9eff" label="タスク" sub={`${doneT}/${totalT}`}/>
        <Ring pct={timePct} color="#34d399" label="時間目標" sub={`${fmtHM(weekTotal)}/${goalHours}h`}/>
        <Ring pct={diaryPct} color="#fbbf24" label="日記" sub={`${diaryCount}/7日`}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#fb923c",fontFamily:"monospace",marginTop:4}}>{fmtHM(todayTotal)||"0m"}</div>
          <div style={{fontSize:10,fontWeight:700,color:"#e8ecf4",marginTop:2}}>今日</div>
          <div style={{fontSize:9,color:"#6b7a99"}}>記録時間</div>
        </div>
      </div>
      <div style={{display:"flex",gap:4}}>
        {days.map((d,i)=>{
          const pct=d.total>0?d.done/d.total:0;
          const isToday=i===todayDayIdx();
          return <div key={i} style={{flex:1,textAlign:"center"}}>
            <div style={{height:36,background:"#161920",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse"}}>
              <div style={{height:`${pct*100}%`,background:isToday?"#4f9eff":"#2a2f3d",transition:"height 0.5s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:9,color:isToday?"#4f9eff":"#6b7a99",marginTop:2,fontWeight:isToday?700:400}}>{d.day}</div>
          </div>;
        })}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("task");
  const [categories, setCategories] = useState(()=>LS.get("tf_categories", DEFAULT_CATS));
  const [selectedCat, setSelectedCat] = useState(()=>LS.get("tf_selectedCat", DEFAULT_CATS[0].id));
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const [weeklyTasks, setWeeklyTasks] = useState(()=>LS.get("tf_weeklyTasks", buildWeeklyTasks(WEEKLY_DEFAULTS)));
  const [customTasks, setCustomTasks] = useState(()=>LS.get("tf_customTasks", Object.fromEntries(DAYS_LABEL.map((_,i)=>[i,[]]))));
  const [addingDay, setAddingDay] = useState(null);
  const [movePopup, setMovePopup] = useState(null);

  const [mode, setMode] = useState("timer");
  const [pomoDuration, setPomoDuration] = useState(25);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef=useRef(null), startTimeRef=useRef(null), baseElapsedRef=useRef(0);
  const pomoDone=mode==="pomodoro"&&elapsed>=pomoDuration*60;

  const [logs, setLogs] = useState(()=>LS.get("tf_logs", []));
  const [editingLog, setEditingLog] = useState(null);

  const [diaries, setDiaries] = useState(()=>LS.get("tf_diaries", {}));
  const [diaryModal, setDiaryModal] = useState(null);
  const [showDiaryList, setShowDiaryList] = useState(false);

  const [goalHours, setGoalHours] = useState(()=>LS.get("tf_goalHours", 10));

  // Persist
  useEffect(()=>LS.set("tf_categories",  categories),  [categories]);
  useEffect(()=>LS.set("tf_selectedCat", selectedCat), [selectedCat]);
  useEffect(()=>LS.set("tf_weeklyTasks", weeklyTasks), [weeklyTasks]);
  useEffect(()=>LS.set("tf_customTasks", customTasks), [customTasks]);
  useEffect(()=>LS.set("tf_logs",        logs),        [logs]);
  useEffect(()=>LS.set("tf_diaries",     diaries),     [diaries]);
  useEffect(()=>LS.set("tf_goalHours",   goalHours),   [goalHours]);

  useEffect(()=>{
    if("Notification" in window&&Notification.permission==="default") Notification.requestPermission();
  },[]);

  useEffect(()=>{
    if(running){
      startTimeRef.current=Date.now();
      intervalRef.current=setInterval(()=>{
        const ne=baseElapsedRef.current+Math.floor((Date.now()-startTimeRef.current)/1000);
        setElapsed(ne);
        if(mode==="pomodoro"&&ne===pomoDuration*60) notify("ポモドーロ完了！",`${pomoDuration}分経過しました！`);
      },500);
    } else {
      clearInterval(intervalRef.current);
      if(startTimeRef.current){ baseElapsedRef.current+=Math.floor((Date.now()-startTimeRef.current)/1000); startTimeRef.current=null; }
    }
    return ()=>clearInterval(intervalRef.current);
  },[running,mode,pomoDuration]);

  const handleStop=()=>{
    setRunning(false);
    const total=baseElapsedRef.current;
    if(total>=10){
      const cat=categories.find(c=>c.id===selectedCat)||categories[0];
      setLogs(p=>[{id:Date.now(),date:todayStr(),label:cat.name,catId:cat.id,duration:total,mode},...p]);
    }
    setElapsed(0); baseElapsedRef.current=0; startTimeRef.current=null;
  };

  const catColor=categories.find(c=>c.id===selectedCat)?.color||"#4f9eff";
  const todayTotal=logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);

  const toggleTask=(dayIdx,id,weekly)=>{
    if(weekly) setWeeklyTasks(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)}));
    else       setCustomTasks(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)}));
  };
  const moveTask=(toDay)=>{
    if(!movePopup) return;
    const {task,fromDay}=movePopup;
    if(task.weekly) setWeeklyTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    else            setCustomTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    setCustomTasks(p=>({...p,[toDay]:[...p[toDay],{...task,id:Date.now(),weekly:false}]}));
    setMovePopup(null);
  };

  const saveDiary=(date,text)=>setDiaries(p=>({...p,[date]:text}));

  const S={
    app:{minHeight:"100vh",background:"#0d0f14",color:"#e8ecf4",fontFamily:"'Noto Sans JP',sans-serif",display:"flex",flexDirection:"column"},
    header:{padding:"14px 16px 0",borderBottom:"1px solid #2a2f3d"},
    tabs:{display:"flex",gap:2,marginTop:10},
    tab:a=>({flex:1,padding:"10px 0",fontSize:12,fontWeight:700,border:"none",borderBottom:a?`2px solid ${catColor}`:"2px solid transparent",background:"transparent",color:a?catColor:"#3d4560",cursor:"pointer",transition:"all 0.2s"}),
    body:{flex:1,padding:"12px 12px",overflowY:"auto"},
    card:{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:12,marginBottom:10},
    input:{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 10px",color:"#e8ecf4",fontSize:12,outline:"none",flex:1},
    btn:(bg="#4f9eff")=>({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}),
    btnSm:(a,c)=>({padding:"5px 10px",fontSize:10,fontWeight:700,border:`1px solid ${a?c:"#2a2f3d"}`,borderRadius:20,background:a?`rgba(${hexRgb(c)},0.2)`:"transparent",color:a?c:"#6b7a99",cursor:"pointer"}),
  };

  // ── Task Tab ─────────────────────────────────────────────────────────────
  const TaskTab = () => {
    const mobile = isMobile();
    return (
      <div>
        {/* Summary + diary */}
        <div style={{...S.card,background:"#161920",borderColor:"rgba(79,158,255,0.2)"}}>
          <Bar24h logs={logs} categories={categories} date={todayStr()}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:"#6b7a99"}}>今日の合計</div>
              <div style={{fontSize:20,fontWeight:800,color:catColor,fontFamily:"monospace"}}>{fmtTime(todayTotal)}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowDiaryList(true)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 12px",cursor:"pointer",color:"#6b7a99",fontSize:11,fontWeight:600}}>
                📔 一覧
              </button>
              <button onClick={()=>setDiaryModal(todayStr())} style={{background:diaries[todayStr()]?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${diaries[todayStr()]?"#fbbf24":"#2a2f3d"}`,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:diaries[todayStr()]?"#fbbf24":"#6b7a99",fontSize:11,fontWeight:600}}>
                {diaries[todayStr()]?"📔 今日の日記":"✏️ 日記を書く"}
              </button>
            </div>
          </div>
        </div>

        {/* Day cards */}
        <div style={{fontSize:12,fontWeight:800,marginBottom:8}}>📋 今週のタスク</div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:8,marginBottom:4}}>
          {DAYS_LABEL.map((day,i)=>{
            const wt=weeklyTasks[i]||[], ct=customTasks[i]||[], all=[...wt,...ct];
            const done=all.filter(t=>t.done).length, isToday=i===todayDayIdx();
            const dayDate=fmtDate(getDayDate(i)), hasDiary=diaries[dayDate]?.trim();
            return (
              <div key={i} style={{...S.card,padding:10,borderColor:isToday?catColor:"#2a2f3d",background:isToday?`rgba(${hexRgb(catColor)},0.06)`:"#1e2330"}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,fontWeight:800,color:isToday?catColor:"#94a3b8"}}>{day}</span>
                    <span style={{fontSize:10,color:"#3d4560"}}>{dayDateStr(i)}</span>
                    <button onClick={()=>setDiaryModal(dayDate)} title="日記" style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:hasDiary?"#fbbf24":"#2a2f3d",transition:"background 0.2s",boxShadow:hasDiary?"0 0 6px #fbbf2488":"none"}}/>
                    </button>
                  </div>
                  {all.length>0&&<span style={{fontSize:9,fontWeight:700,color:done===all.length?"#34d399":"#6b7a99"}}>{done}/{all.length}</span>}
                </div>
                {/* Tasks */}
                {all.length===0&&<div style={{fontSize:10,color:"#3d4560",textAlign:"center",padding:"4px 0"}}>—</div>}
                {all.map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:"1px solid #2a2f3d",opacity:t.done?0.4:1}}>
                    {/* 移動ボタン */}
                    <button
                      onClick={()=>setMovePopup({task:t,fromDay:i})}
                      style={{background:"none",border:"none",color:"#3d4560",fontSize:13,flexShrink:0,cursor:"pointer",padding:"2px 3px",lineHeight:1}}
                      title="移動"
                    >⇄</button>
                    <div onClick={()=>toggleTask(i,t.id,t.weekly)} style={{width:14,height:14,borderRadius:4,flexShrink:0,border:`2px solid ${t.done?"#34d399":"#3d4560"}`,background:t.done?"#34d399":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {t.done&&<span style={{color:"#fff",fontSize:9}}>✓</span>}
                    </div>
                    <span style={{fontSize:11,flex:1,lineHeight:1.3}}>{t.label}</span>
                    {t.weekly&&<span style={{fontSize:9,background:"rgba(79,158,255,0.12)",color:"#4f9eff",borderRadius:4,padding:"1px 4px"}}>毎週</span>}
                  </div>
                ))}
                {/* Add inline */}
                {addingDay===i?(
                  <TaskInput
                    onAdd={label=>{ if(!label.trim()) return; setCustomTasks(p=>({...p,[i]:[...p[i],{id:Date.now(),label:label.trim(),done:false}]})); setAddingDay(null); }}
                    onCancel={()=>setAddingDay(null)}
                    inputStyle={{...S.input,fontSize:11,padding:"5px 8px"}}
                    btnStyle={S.btn}
                  />
                ):(
                  <button onClick={()=>setAddingDay(i)} style={{width:"100%",background:"none",border:"1px dashed #2a2f3d",borderRadius:6,padding:"5px 0",color:"#3d4560",cursor:"pointer",fontSize:14,marginTop:6}}>+</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Timer Tab (full screen when running) ──────────────────────────────────
  const TimerTab = () => (
    <div style={{maxWidth:400,margin:"0 auto"}}>
      {!running&&(
        <>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
            {["timer","pomodoro"].map(m=>(
              <button key={m} style={S.btnSm(mode===m,catColor)} onClick={()=>{setMode(m);setElapsed(0);baseElapsedRef.current=0;}}>
                {m==="timer"?"⏱ タイマー":"🍅 ポモドーロ"}
              </button>
            ))}
          </div>
          <CategoryDial categories={categories} selected={selectedCat} onSelect={setSelectedCat} disabled={false}/>
          <div style={{textAlign:"center",marginBottom:10}}>
            <button style={{background:"none",border:"none",color:"#3d4560",fontSize:11,cursor:"pointer"}} onClick={()=>setShowCatMgr(true)}>⚙ カテゴリーを管理</button>
          </div>
          {mode==="pomodoro"&&(
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[15,25,45,60].map(m=>(
                <button key={m} style={S.btnSm(pomoDuration===m,"#fb923c")} onClick={()=>{setPomoDuration(m);setElapsed(0);baseElapsedRef.current=0;}}>{m}分</button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={running} color={catColor}/>
      </div>

      {pomoDone&&(
        <div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:10,padding:10,textAlign:"center",marginBottom:12,fontSize:12,color:"#34d399",fontWeight:700}}>
          🎉 {pomoDuration}分完了！計測は継続中
        </div>
      )}

      {running&&(
        <div style={{textAlign:"center",marginBottom:8,fontSize:11,color:"#6b7a99"}}>
          カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"center",gap:10}}>
        {!running?(
          <button style={{...S.btn("#34d399"),padding:"14px 44px",fontSize:16,borderRadius:50}} onClick={()=>setRunning(true)}>▶ 開始</button>
        ):(
          <>
            <button style={{...S.btn("#fb923c"),padding:"14px 28px",fontSize:15,borderRadius:50}} onClick={()=>setRunning(false)}>⏸ 一時停止</button>
            <button style={{...S.btn("#f87171"),padding:"14px 24px",fontSize:15,borderRadius:50}} onClick={handleStop}>■ 終了・記録</button>
          </>
        )}
      </div>

      {elapsed>0&&(
        <div style={{textAlign:"center",marginTop:12,color:"#6b7a99",fontSize:12}}>
          経過: <span style={{color:"#e8ecf4",fontWeight:700,fontFamily:"monospace"}}>{fmtTime(elapsed)}</span>
        </div>
      )}
    </div>
  );

  // ── Log Tab ───────────────────────────────────────────────────────────────
  const LogTab = () => {
    const [editGoal,setEditGoal]=useState(false);
    const [gInput,setGInput]=useState(String(goalHours));
    const byDate={};
    logs.forEach(l=>{ if(!byDate[l.date]) byDate[l.date]=[]; byDate[l.date].push(l); });
    const dates=Object.keys(byDate).sort().reverse();
    return (
      <div>
        <WeeklyProgress weeklyTasks={weeklyTasks} customTasks={customTasks} logs={logs} diaries={diaries} goalHours={goalHours}/>
        <div style={{...S.card,display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <span style={{fontSize:12,color:"#6b7a99"}}>週間時間目標</span>
          {editGoal?(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input style={{...S.input,width:54,textAlign:"center"}} type="number" min="1" value={gInput} onChange={e=>setGInput(e.target.value)}/>
              <span style={{color:"#6b7a99",fontSize:12}}>時間</span>
              <button style={S.btn()} onClick={()=>{setGoalHours(Math.max(1,Number(gInput)));setEditGoal(false);}}>✓</button>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:"monospace",fontSize:14,fontWeight:800,color:"#34d399"}}>{goalHours}h</span>
              <button style={{...S.btn("#2a2f3d"),padding:"5px 10px",fontSize:11}} onClick={()=>setEditGoal(true)}>変更</button>
            </div>
          )}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:800}}>📊 記録</span>
          <button onClick={()=>setShowDiaryList(true)} style={{background:"rgba(251,191,36,0.1)",border:"1px solid #fbbf2440",borderRadius:8,padding:"5px 10px",color:"#fbbf24",fontSize:11,cursor:"pointer",fontWeight:600}}>📔 日記一覧</button>
        </div>
        {logs.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:40,fontSize:13}}>記録がありません。<br/>タイマーで計測を始めましょう！</div>}
        {dates.map(date=>{
          const dl=byDate[date], total=dl.reduce((s,l)=>s+l.duration,0);
          const byCat={}; dl.forEach(l=>{ byCat[l.catId]=(byCat[l.catId]||0)+l.duration; });
          const hasDiary=diaries[date]?.trim();
          return (
            <div key={date} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:800,color:catColor}}>{date}</span>
                  {hasDiary&&<button onClick={()=>setDiaryModal(date)} style={{background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf24",borderRadius:6,padding:"2px 7px",color:"#fbbf24",fontSize:10,cursor:"pointer",fontWeight:700}}>📔</button>}
                </div>
                <span style={{fontFamily:"monospace",fontSize:11,color:"#34d399",fontWeight:700}}>合計 {fmtHM(total)}</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"#1e2330",display:"flex",overflow:"hidden",marginBottom:8}}>
                {Object.entries(byCat).map(([cid,dur])=>{ const cat=categories.find(c=>c.id===cid); return <div key={cid} style={{width:`${(dur/86400)*100}%`,background:cat?.color||"#6b7a99",minWidth:dur>60?2:0}}/>; })}
              </div>
              {dl.map(l=>{ const cat=categories.find(c=>c.id===l.catId); return (
                <div key={l.id} style={{...S.card,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:cat?.color||"#6b7a99",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700}}>{l.label}</div>
                    <div style={{fontSize:10,color:"#6b7a99",marginTop:1}}>{l.mode==="pomodoro"?"🍅":"⏱"}{cat&&<span style={{marginLeft:4,color:cat.color}}>#{cat.name}</span>}</div>
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:13,fontWeight:800}}>{fmtHM(l.duration)}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    <button style={{background:"#2a2f3d",border:"none",borderRadius:5,padding:"3px 8px",color:"#94a3b8",cursor:"pointer",fontSize:10}} onClick={()=>setEditingLog(l)}>編集</button>
                    <button style={{background:"#2a2f3d",border:"none",borderRadius:5,padding:"3px 8px",color:"#f87171",cursor:"pointer",fontSize:10}} onClick={()=>setLogs(p=>p.filter(x=>x.id!==l.id))}>削除</button>
                  </div>
                </div>
              );})}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={S.app}>
      {/* Running: full screen timer overlay */}
      {running&&tab!=="timer"&&(
        <div style={{position:"fixed",inset:0,zIndex:90,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:11,color:"#6b7a99",marginBottom:8,letterSpacing:1}}>計測中</div>
          <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={true} color={catColor}/>
          <div style={{marginTop:6,fontSize:11,color:"#6b7a99"}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          <div style={{display:"flex",gap:12,marginTop:24}}>
            <button style={{...S.btn("#fb923c"),padding:"13px 28px",fontSize:15,borderRadius:50}} onClick={()=>setRunning(false)}>⏸ 一時停止</button>
            <button style={{...S.btn("#f87171"),padding:"13px 24px",fontSize:15,borderRadius:50}} onClick={()=>{handleStop();setTab("timer");}}>■ 終了・記録</button>
          </div>
          <button style={{marginTop:20,background:"none",border:"none",color:"#4f9eff",cursor:"pointer",fontSize:12,fontWeight:600}} onClick={()=>setTab("timer")}>タイマー画面に戻る →</button>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:17,fontWeight:900,letterSpacing:"-0.5px"}}>TimeFlow</div>
            <div style={{fontSize:10,color:"#6b7a99"}}>タスク & 時間管理</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setShowBackup(true)} style={{background:"none",border:"none",color:"#3d4560",fontSize:18,cursor:"pointer",padding:2}} title="バックアップ">💾</button>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:running?"#34d399":"#3d4560",boxShadow:running?"0 0 8px #34d399":"none"}}/>
              <span style={{fontSize:10,color:running?"#34d399":"#3d4560",fontFamily:"monospace"}}>{running?fmtTime(elapsed):"待機中"}</span>
            </div>
          </div>
        </div>
        <div style={S.tabs}>
          {[{id:"task",label:"タスク"},{id:"timer",label:"タイマー"},{id:"log",label:"記録"}].map(t=>(
            <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={S.body}>
        {tab==="task"&&<TaskTab/>}
        {tab==="timer"&&<TimerTab/>}
        {tab==="log"&&<LogTab/>}
      </div>

      {showCatMgr&&<CatManagerModal categories={categories} onChange={c=>{setCategories(c);if(!c.find(x=>x.id===selectedCat))setSelectedCat(c[0]?.id);}} onClose={()=>setShowCatMgr(false)}/>}
      {editingLog&&<EditLogModal log={editingLog} categories={categories} onSave={u=>{setLogs(p=>p.map(l=>l.id===u.id?u:l));setEditingLog(null);}} onClose={()=>setEditingLog(null)}/>}
      {diaryModal&&<DiaryModal date={diaryModal} diary={diaries[diaryModal]} onSave={(t)=>saveDiary(diaryModal,t)} onClose={()=>setDiaryModal(null)}/>}
      {showDiaryList&&<DiaryListModal diaries={diaries} onOpen={d=>{setShowDiaryList(false);setDiaryModal(d);}} onClose={()=>setShowDiaryList(false)}/>}
      {movePopup&&<MoveTaskPopup task={movePopup.task} fromDay={movePopup.fromDay} onMove={moveTask} onClose={()=>setMovePopup(null)}/>}
      {showBackup&&<BackupModal
        data={{categories,weeklyTasks,customTasks,logs,diaries,goalHours,exportedAt:new Date().toISOString()}}
        onRestore={p=>{
          if(p.categories)  setCategories(p.categories);
          if(p.weeklyTasks) setWeeklyTasks(p.weeklyTasks);
          if(p.customTasks) setCustomTasks(p.customTasks);
          if(p.logs)        setLogs(p.logs);
          if(p.diaries)     setDiaries(p.diaries);
          if(p.goalHours)   setGoalHours(p.goalHours);
        }}
        onClose={()=>setShowBackup(false)}
      />}
    </div>
  );
}

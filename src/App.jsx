import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CATS = [
  { id:"study",    name:"勉強",   color:"#4f9eff" },
  { id:"work",     name:"仕事",   color:"#a78bfa" },
  { id:"house",    name:"家事",   color:"#34d399" },
  { id:"exercise", name:"運動",   color:"#fb923c" },
  { id:"other",    name:"その他", color:"#94a3b8" },
];
const PRESET_COLORS = ["#4f9eff","#a78bfa","#34d399","#fb923c","#f87171","#fbbf24","#e879f9","#2dd4bf","#f472b6","#94a3b8"];
const DAYS_LABEL = ["月","火","水","木","金","土日"];
const BASE_FONT = 17;

const pad = n => String(n).padStart(2,"0");
const fmtTime  = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
const fmtHMS   = s => {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  if(h>0) return `${h}時間${m}分${sec}秒`;
  if(m>0) return `${m}分${sec}秒`;
  return `${sec}秒`;
};
const fmtHM    = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h&&m?`${h}h${m}m`:h?`${h}h`:`${m}m`; };
const fmtDate  = d => `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`;
const todayStr = () => fmtDate(new Date());
const hexRgb   = h => `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;

const getWeekMonday = () => {
  const d=new Date(), day=d.getDay();
  d.setDate(d.getDate()+(day===0?-6:1-day)); d.setHours(0,0,0,0); return d;
};
const getDayDate  = idx => { const m=getWeekMonday(); m.setDate(m.getDate()+(idx===5?5:idx)); return m; };
const dayDateStr  = idx => { const d=getDayDate(idx); return `${d.getMonth()+1}/${d.getDate()}`; };
const todayDayIdx = () => { const d=new Date().getDay(); return (d===0||d===6)?5:d-1; };

const WEEKLY_DEFAULTS = [
  { label:"英語単語", days:[0,1,2,3,4] },
  { label:"読書",     days:[0,1,2,3,4,5] },
];
const buildWeeklyTasks = tpls => Object.fromEntries(
  DAYS_LABEL.map((_,i)=>[i, tpls.filter(t=>t.days.includes(i)).map(t=>({id:`w_${t.label}_${i}`,label:t.label,done:false,weekly:true}))])
);

const _store = {};
const LS = {
  get: (k,d) => { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):(_store[k]??d); }catch{ return _store[k]??d; } },
  set: (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} _store[k]=v; },
};

function notify(title, body) {
  if("Notification" in window && Notification.permission==="granted") new Notification(title,{body});
}

// ─── Ring Timer ───────────────────────────────────────────────────────────────
function RingTimer({ elapsed, total, running, color }) {
  const r=88, circ=2*Math.PI*r;
  const prog = total>0?Math.min(elapsed/total,1):(elapsed%3600)/3600;
  const dash = circ*(1-prog);
  const rc = total>0?(prog<0.6?"#34d399":prog<0.85?"#fb923c":"#f87171"):color;
  const dm = total>0?pad(Math.floor((total-elapsed)/60)):pad(Math.floor((elapsed%3600)/60));
  const ds = total>0?pad((total-elapsed)%60):pad(elapsed%60);
  const dh = total===0?pad(Math.floor(elapsed/3600)):null;
  return (
    <svg width="240" height="240" viewBox="0 0 220 220">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="cg"><stop offset="0%" stopColor={rc} stopOpacity="0.12"/><stop offset="100%" stopColor={rc} stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx="110" cy="110" r="100" fill="url(#cg)"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke="#1e2330" strokeWidth="14"/>
      <circle cx="110" cy="110" r={r} fill="none" stroke={rc} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash} transform="rotate(-90 110 110)"
        filter="url(#glow)" style={{transition:"stroke-dashoffset 1s linear,stroke 0.5s"}}/>
      {prog>0.01&&<circle cx={110+r*Math.cos(2*Math.PI*prog-Math.PI/2)} cy={110+r*Math.sin(2*Math.PI*prog-Math.PI/2)} r="7" fill={rc} filter="url(#glow)"/>}
      {dh&&<text x="110" y="95" textAnchor="middle" fill="#6b7a99" fontSize="14" fontFamily="monospace">{dh}h</text>}
      <text x="110" y={dh?"122":"118"} textAnchor="middle" fill="#e8ecf4" fontSize={dh?"32":"38"} fontWeight="800" fontFamily="monospace">{dm}:{ds}</text>
      <text x="110" y="142" textAnchor="middle" fill={running?rc:"#3d4560"} fontSize="12" fontFamily="monospace" fontWeight="600">{running?"● REC":"⏸ PAUSE"}</text>
    </svg>
  );
}

// ─── 24h Timeline Bar ─────────────────────────────────────────────────────────
function TimelineBar({ logs, categories, date }) {
  const catMap = Object.fromEntries(categories.map(c=>[c.id,c]));
  const dayLogs = logs.filter(l=>l.date===date && l.startHour != null);
  const HOURS = Array.from({length:24},(_,i)=>i);

  // Build segments: each log has startHour (float, 0-24) and duration in sec
  // We store startHour when recording starts
  const total = dayLogs.reduce((s,l)=>s+l.duration,0);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#6b7a99",fontWeight:700}}>24時間タイムライン</span>
        <span style={{fontSize:11,color:"#6b7a99"}}>{fmtHMS(total)||"0秒"}</span>
      </div>
      {/* Timeline */}
      <div style={{position:"relative",height:56,background:"#161920",borderRadius:8,overflow:"hidden",border:"1px solid #2a2f3d",marginBottom:6}}>
        {/* Hour grid lines */}
        {[6,9,12,15,18,21].map(h=>(
          <div key={h} style={{position:"absolute",left:`${(h/24)*100}%`,top:0,bottom:0,width:1,background:"#2a2f3d"}}>
            <span style={{position:"absolute",top:2,left:2,fontSize:8,color:"#3d4560"}}>{h}</span>
          </div>
        ))}
        {/* Log segments */}
        {dayLogs.map((l,i)=>{
          const cat=catMap[l.catId];
          const left=(l.startHour/24)*100;
          const width=(l.duration/86400)*100;
          return (
            <div key={i} title={`${cat?.name||""} ${fmtHMS(l.duration)}`} style={{
              position:"absolute",
              left:`${Math.min(left,99)}%`,
              width:`${Math.min(width,100-left)}%`,
              top:8, bottom:8,
              background:cat?.color||"#6b7a99",
              borderRadius:3,
              minWidth:3,
              opacity:0.85,
            }}/>
          );
        })}
      </div>
      {/* Legend */}
      {dayLogs.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px"}}>
          {Object.entries(
            dayLogs.reduce((acc,l)=>{ acc[l.catId]=(acc[l.catId]||0)+l.duration; return acc; },{})
          ).map(([catId,dur])=>{
            const cat=catMap[catId];
            return (
              <div key={catId} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:8,height:8,borderRadius:2,background:cat?.color||"#6b7a99"}}/>
                <span style={{fontSize:10,color:"#94a3b8"}}>{cat?.name} {fmtHMS(dur)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Category Dial (display only, reorder via CatManager) ────────────────────
function CategoryDial({ categories, selected, onSelect, disabled }) {
  const ref = useRef(null);
  useEffect(()=>{ const el=ref.current; if(!el) return; const idx=categories.findIndex(c=>c.id===selected); el.scrollLeft=idx*82-el.clientWidth/2+41; },[selected,categories]);
  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:"#6b7a99",fontWeight:700,marginBottom:6,textAlign:"center"}}>カテゴリー</div>
      <div ref={ref} style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 12px 6px",scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
        {categories.map((c,i)=>{ const a=selected===c.id; return (
          <div key={c.id} onClick={()=>!disabled&&onSelect(c.id)}
            style={{scrollSnapAlign:"center",flexShrink:0,width:72,padding:"10px 4px",borderRadius:10,
              border:`2px solid ${a?c.color:"#2a2f3d"}`,
              background:a?`rgba(${hexRgb(c.color)},0.18)`:"#161920",
              cursor:disabled?"not-allowed":"pointer",textAlign:"center",transition:"all 0.2s",
              transform:a?"scale(1.06)":"scale(1)",opacity:disabled&&!a?0.4:1}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:c.color,margin:"0 auto 5px",boxShadow:a?`0 0 10px ${c.color}88`:"none"}}/>
            <div style={{fontSize:11,fontWeight:700,color:a?c.color:"#6b7a99"}}>{c.name}</div>
          </div>
        );})}
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

// ─── TaskInput (uncontrolled – fixes iOS double-input) ────────────────────────
function TaskInput({ onAdd, onCancel, inputStyle, btnStyle }) {
  const ref=useRef(null);
  const submit=()=>{ const v=ref.current?.value||""; if(v.trim()) onAdd(v.trim()); else onCancel(); };
  useEffect(()=>{ ref.current?.focus(); },[]);
  return (
    <div style={{display:"flex",gap:4,marginTop:6}}>
      <input ref={ref} style={inputStyle} placeholder="タスク名" defaultValue=""
        onKeyDown={e=>{ if(e.key==="Enter") submit(); if(e.key==="Escape") onCancel(); }}/>
      <button style={{...btnStyle(),padding:"5px 8px",fontSize:11}} onClick={submit}>✓</button>
      <button style={{...btnStyle("#2a2f3d"),padding:"5px 8px",fontSize:11}} onClick={onCancel}>✕</button>
    </div>
  );
}

// ─── Move Task Popup ──────────────────────────────────────────────────────────
function MoveTaskPopup({ task, fromDay, onMove, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:BASE_FONT+1,fontWeight:800,marginBottom:4}}>タスクを移動</div>
        <div style={{fontSize:BASE_FONT-1,color:"#6b7a99",marginBottom:16}}>「{task.label}」をどの曜日に移動？</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {DAYS_LABEL.map((d,i)=>(
            <button key={i} disabled={i===fromDay} onClick={()=>onMove(i)} style={{padding:"12px 8px",borderRadius:10,border:`1px solid ${i===fromDay?"#3d4560":"#2a2f3d"}`,background:i===fromDay?"#161920":"#2a2f3d",color:i===fromDay?"#3d4560":"#e8ecf4",cursor:i===fromDay?"not-allowed":"pointer",fontWeight:700,fontSize:BASE_FONT}}>
              <div style={{fontSize:10,color:"#6b7a99",marginBottom:2}}>{dayDateStr(i)}</div>
              {d}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{width:"100%",marginTop:12,background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-1}}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── Diary Modal ──────────────────────────────────────────────────────────────
function DiaryModal({ date, diary, onSave, onClose }) {
  const [text,setText]=useState(diary||"");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📔 日記</div><div style={{fontSize:11,color:"#fbbf24"}}>{date}</div></div>
          <button onClick={()=>{onSave(text);onClose();}} style={{background:"#4f9eff",border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT}}>保存</button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="今日のことを書いておこう..."
          style={{width:"100%",boxSizing:"border-box",height:220,background:"#161920",border:"1px solid #2a2f3d",borderRadius:10,padding:14,color:"#e8ecf4",fontSize:BASE_FONT+1,resize:"none",outline:"none",lineHeight:1.8,fontFamily:"inherit"}} autoFocus/>
        <button onClick={onClose} style={{marginTop:10,background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-1,width:"100%"}}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── Diary List ───────────────────────────────────────────────────────────────
function DiaryListModal({ diaries, onOpen, onClose }) {
  const [search,setSearch]=useState("");
  const entries=Object.entries(diaries).filter(([,v])=>v?.trim()).sort(([a],[b])=>b.localeCompare(a));
  const filtered=search?entries.filter(([d,t])=>d.includes(search)||t.includes(search)):entries;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📔 日記一覧</div>
          <span style={{fontSize:11,color:"#6b7a99"}}>{entries.length}件</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="日付・内容で検索..."
          style={{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 12px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",marginBottom:10,width:"100%",boxSizing:"border-box"}}/>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:24,fontSize:BASE_FONT}}>日記がありません</div>}
          {filtered.map(([date,text])=>(
            <div key={date} onClick={()=>onOpen(date)} style={{background:"#161920",borderRadius:10,border:"1px solid #2a2f3d",padding:"12px 14px",marginBottom:8,cursor:"pointer"}}>
              <div style={{fontSize:11,color:"#fbbf24",fontWeight:700,marginBottom:4}}>{date}</div>
              <div style={{fontSize:BASE_FONT-1,color:"#94a3b8",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",whiteSpace:"pre-wrap"}}>{text}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-1,paddingTop:12}}>閉じる</button>
      </div>
    </div>
  );
}

// ─── Edit Log Modal ───────────────────────────────────────────────────────────
function EditLogModal({ log, categories, onSave, onClose }) {
  const [dur,setDur]=useState(Math.floor(log.duration/60));
  const [label,setLabel]=useState(log.label);
  const [catId,setCatId]=useState(log.catId);
  const iS={background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"8px 12px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",width:"100%",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:16,border:"1px solid #2a2f3d",padding:24,width:320,maxWidth:"90vw"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:BASE_FONT+2,fontWeight:800,marginBottom:16}}>記録を編集</div>
        <div style={{fontSize:11,color:"#6b7a99",marginBottom:4}}>内容</div><input style={iS} value={label} onChange={e=>setLabel(e.target.value)}/>
        <div style={{fontSize:11,color:"#6b7a99",margin:"12px 0 4px"}}>時間（分）</div><input style={iS} type="number" min="1" value={dur} onChange={e=>setDur(Number(e.target.value))}/>
        <div style={{fontSize:11,color:"#6b7a99",margin:"12px 0 6px"}}>カテゴリー</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {categories.map(c=><div key={c.id} onClick={()=>setCatId(c.id)} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,border:`2px solid ${catId===c.id?c.color:"#2a2f3d"}`,background:catId===c.id?`rgba(${hexRgb(c.color)},0.2)`:"transparent",color:catId===c.id?c.color:"#6b7a99",cursor:"pointer"}}>{c.name}</div>)}
        </div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          <button style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#2a2f3d",color:"#fff",fontWeight:700,cursor:"pointer"}} onClick={onClose}>キャンセル</button>
          <button style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#4f9eff",color:"#fff",fontWeight:700,cursor:"pointer"}} onClick={()=>onSave({...log,label,catId,duration:dur*60})}>保存</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cat Manager ─────────────────────────────────────────────────────────────
function CatManagerModal({ categories, onChange, onClose }) {
  const [cats,setCats]=useState(categories.map(c=>({...c})));
  const [newName,setNewName]=useState(""); const [newColor,setNewColor]=useState(PRESET_COLORS[0]); const [editing,setEditing]=useState(null);
  const iS={background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"8px 10px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",flex:1};
  const bS=bg=>({padding:"7px 10px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11});

  const moveUp   = i => { if(i===0) return; const a=[...cats]; [a[i-1],a[i]]=[a[i],a[i-1]]; setCats(a); };
  const moveDown = i => { if(i===cats.length-1) return; const a=[...cats]; [a[i],a[i+1]]=[a[i+1],a[i]]; setCats(a); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"82vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:BASE_FONT+2,fontWeight:800}}>カテゴリー管理</span>
          <button style={bS("#4f9eff")} onClick={()=>{onChange(cats);onClose();}}>完了</button>
        </div>
        {cats.map((c,i)=>(
          <div key={c.id} style={{marginBottom:8,background:"#161920",borderRadius:10,padding:10,border:"1px solid #2a2f3d"}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {/* Up/Down arrows */}
              <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                <button onClick={()=>moveUp(i)} disabled={i===0} style={{background:i===0?"#1e2330":"#2a2f3d",border:"none",borderRadius:4,width:24,height:22,color:i===0?"#3d4560":"#e8ecf4",cursor:i===0?"not-allowed":"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                <button onClick={()=>moveDown(i)} disabled={i===cats.length-1} style={{background:i===cats.length-1?"#1e2330":"#2a2f3d",border:"none",borderRadius:4,width:24,height:22,color:i===cats.length-1?"#3d4560":"#e8ecf4",cursor:i===cats.length-1?"not-allowed":"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
              </div>
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
            <input style={iS} placeholder="名前" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&newName.trim()){ setCats(p=>[...p,{id:Date.now().toString(),name:newName.trim(),color:newColor}]); setNewName(""); }}}/>
            <button style={bS("#34d399")} onClick={()=>{ if(!newName.trim()) return; setCats(p=>[...p,{id:Date.now().toString(),name:newName.trim(),color:newColor}]); setNewName(""); }}>追加</button>
          </div>
          <ColorPicker value={newColor} onChange={setNewColor}/>
        </div>
      </div>
    </div>
  );
}

// ─── Backup Modal ─────────────────────────────────────────────────────────────
function BackupModal({ data, onRestore, onClose }) {
  const [mode,setMode]=useState("menu"); const [importText,setImportText]=useState(""); const [msg,setMsg]=useState(null);
  const jsonStr=JSON.stringify(data,null,2);
  const bS=(bg,fg="#fff")=>({background:bg,color:fg,border:"none",borderRadius:10,padding:"12px 0",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT,width:"100%",marginBottom:8});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:BASE_FONT+3,fontWeight:800}}>💾 バックアップ</div><div style={{fontSize:10,color:"#6b7a99"}}>{(new Blob([jsonStr]).size/1024).toFixed(1)} KB</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        {msg&&<div style={{background:msg.ok?"rgba(52,211,153,0.12)":"rgba(248,113,113,0.12)",border:`1px solid ${msg.ok?"#34d399":"#f87171"}`,borderRadius:8,padding:10,marginBottom:12,fontSize:BASE_FONT-1,color:msg.ok?"#34d399":"#f87171",fontWeight:600,textAlign:"center"}}>{msg.ok?"✓ ":"⚠ "}{msg.text}</div>}
        {mode==="menu"&&<><button style={bS("#4f9eff")} onClick={()=>setMode("export")}>📤 バックアップを書き出す</button><button style={bS("#2a2f3d")} onClick={()=>setMode("import")}>📥 バックアップから復元する</button></>}
        {mode==="export"&&<>
          <button style={bS("#4f9eff")} onClick={()=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([jsonStr],{type:"application/json"})); a.download=`timeflow_${new Date().toISOString().slice(0,10)}.json`; a.click(); setMsg({ok:true,text:"保存しました！"}); }}>📄 JSONファイルとして保存</button>
          <button style={bS("#2a2f3d")} onClick={()=>navigator.clipboard.writeText(jsonStr).then(()=>setMsg({ok:true,text:"コピーしました！"})).catch(()=>setMsg({ok:false,text:"コピー失敗"}))}>📋 クリップボードにコピー</button>
          <button style={{...bS("#161920","#6b7a99"),border:"1px solid #2a2f3d"}} onClick={()=>setMode("menu")}>← 戻る</button>
        </>}
        {mode==="import"&&<>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder='{"categories":[...],"logs":[...],...}' style={{width:"100%",boxSizing:"border-box",height:120,background:"#161920",border:"1px solid #2a2f3d",borderRadius:10,padding:12,color:"#e8ecf4",fontSize:11,resize:"none",outline:"none",fontFamily:"monospace",marginBottom:8}}/>
          <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#f87171"}}>⚠ 復元すると現在のデータが上書きされます</div>
          <button style={bS("#f87171")} onClick={()=>{ try{ const p=JSON.parse(importText); if(!p.categories||!p.logs) throw new Error("形式エラー"); onRestore(p); setMsg({ok:true,text:"復元しました！"}); setTimeout(onClose,1200); }catch(e){ setMsg({ok:false,text:e.message}); }}}>復元する</button>
          <button style={{...bS("#161920","#6b7a99"),border:"1px solid #2a2f3d"}} onClick={()=>setMode("menu")}>← 戻る</button>
        </>}
      </div>
    </div>
  );
}

// ─── Weekly Progress ──────────────────────────────────────────────────────────
function WeeklyProgress({ weeklyTasks, customTasks, logs, diaries, goalHours, onSelectDay, selectedDay, studyCatId }) {
  const days=DAYS_LABEL.map((_,i)=>{ const wt=weeklyTasks[i]||[],ct=customTasks[i]||[],all=[...wt,...ct]; return {day:DAYS_LABEL[i],total:all.length,done:all.filter(t=>t.done).length}; });
  const totalT=days.reduce((s,d)=>s+d.total,0), doneT=days.reduce((s,d)=>s+d.done,0);
  const taskPct=totalT>0?Math.round(doneT/totalT*100):0;

  // Study-only time for goal tracking
  const studyWeekTotal=logs.filter(l=>l.catId===studyCatId).reduce((s,l)=>s+l.duration,0);
  const studyTodayTotal=logs.filter(l=>l.catId===studyCatId&&l.date===todayStr()).reduce((s,l)=>s+l.duration,0);
  const timePct=goalHours>0?Math.min(Math.round(studyWeekTotal/goalHours/3600*100),100):0;
  const goalReached = studyWeekTotal >= goalHours*3600;

  const todayTotal=logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);
  const mon=getWeekMonday(); let diaryCount=0;
  for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(d.getDate()+i); if(diaries[fmtDate(d)]?.trim()) diaryCount++; }
  const diaryPct=Math.round(diaryCount/7*100);

  const Ring=({pct,color,label,sub,achieved})=>{
    const r=20,c=2*Math.PI*r,d=c*(1-pct/100);
    return <div style={{textAlign:"center"}}>
      <svg width="56" height="56" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#2a2f3d" strokeWidth="5"/>
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={d} transform="rotate(-90 24 24)" style={{transition:"stroke-dashoffset 0.6s"}}/>
        <text x="24" y="28" textAnchor="middle" fill={color} fontSize="10" fontWeight="800" fontFamily="monospace">{pct}%</text>
      </svg>
      <div style={{fontSize:10,fontWeight:700,color:"#e8ecf4",marginTop:2}}>{label}{achieved&&<span style={{marginLeft:2}}>🎯</span>}</div>
      <div style={{fontSize:9,color:"#6b7a99"}}>{sub}</div>
    </div>;
  };

  // Selected day stats
  const selDate = fmtDate(getDayDate(selectedDay));
  const selLogs = logs.filter(l=>l.date===selDate);
  const selTotal = selLogs.reduce((s,l)=>s+l.duration,0);
  const selStudyTotal = selLogs.filter(l=>l.catId===studyCatId).reduce((s,l)=>s+l.duration,0);
  const selD = days[selectedDay];
  const selTaskPct = selD.total>0?Math.round(selD.done/selD.total*100):0;

  return (
    <div style={{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:14,marginBottom:12}}>
      {/* Goal reached banner */}
      {goalReached&&(
        <div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:BASE_FONT-2,color:"#34d399",fontWeight:700,textAlign:"center"}}>
          🎯 今週の勉強目標達成！{fmtHM(studyWeekTotal)} / {goalHours}h
        </div>
      )}
      {/* Week rings */}
      <div style={{fontSize:BASE_FONT-2,fontWeight:800,marginBottom:10,color:"#6b7a99"}}>今週の進捗</div>
      <div style={{display:"flex",justifyContent:"space-around",marginBottom:14}}>
        <Ring pct={taskPct} color="#4f9eff" label="タスク" sub={`${doneT}/${totalT}`}/>
        <Ring pct={timePct} color="#34d399" label="勉強目標" sub={`${fmtHM(studyWeekTotal)}/${goalHours}h`} achieved={goalReached}/>
        <Ring pct={diaryPct} color="#fbbf24" label="日記" sub={`${diaryCount}/7日`}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#fb923c",fontFamily:"monospace",marginTop:4}}>{fmtHM(todayTotal)||"0m"}</div>
          <div style={{fontSize:9,fontWeight:700,color:"#e8ecf4",marginTop:2}}>今日合計</div>
          <div style={{fontSize:9,color:"#4f9eff"}}>{fmtHM(studyTodayTotal)||"0m"} 勉強</div>
        </div>
      </div>

      {/* Day selector bar */}
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {days.map((d,i)=>{ const pct=d.total>0?d.done/d.total:0, isSel=i===selectedDay, isToday=i===todayDayIdx(); return (
          <div key={i} onClick={()=>onSelectDay(i)} style={{flex:1,textAlign:"center",cursor:"pointer"}}>
            <div style={{height:36,background:"#161920",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse",border:isSel?"1.5px solid #4f9eff":"1.5px solid transparent",transition:"border 0.2s"}}>
              <div style={{height:`${pct*100}%`,background:isToday?"#4f9eff":"#2a2f3d",transition:"height 0.5s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:9,color:isSel?"#4f9eff":isToday?"#94a3b8":"#6b7a99",marginTop:2,fontWeight:isSel||isToday?700:400}}>{d.day}</div>
          </div>
        );})}
      </div>

      {/* Selected day detail */}
      <div style={{background:"#161920",borderRadius:8,padding:10,border:"1px solid #2a2f3d"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:11,fontWeight:700,color:"#4f9eff"}}>{DAYS_LABEL[selectedDay]} {dayDateStr(selectedDay)} の進捗</span>
          {diaries[selDate]?.trim()
            ?<span style={{fontSize:10,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf2466",borderRadius:6,padding:"2px 8px"}}>📔 日記あり</span>
            :<span style={{fontSize:10,color:"#3d4560",fontWeight:600,background:"#1e2330",border:"1px solid #2a2f3d",borderRadius:6,padding:"2px 8px"}}>日記なし</span>
          }
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#4f9eff"}}>{selTaskPct}%</div>
            <div style={{fontSize:9,color:"#6b7a99"}}>タスク {selD.done}/{selD.total}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#34d399"}}>{fmtHM(selStudyTotal)||"0m"}</div>
            <div style={{fontSize:9,color:"#6b7a99"}}>勉強時間</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#94a3b8"}}>{fmtHM(selTotal)||"0m"}</div>
            <div style={{fontSize:9,color:"#6b7a99"}}>合計時間</div>
          </div>
          {diaries[selDate]?.trim()&&<div style={{textAlign:"center"}}>
            <div style={{fontSize:16}}>📔</div>
            <div style={{fontSize:9,color:"#fbbf24"}}>日記あり</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Long-Term Task Modal ─────────────────────────────────────────────────────
function LongTermModal({ tasks, onSave, onClose }) {
  const [items, setItems] = useState(tasks.map(t=>({...t})));
  const [newLabel, setNewLabel] = useState("");
  const [showDone, setShowDone] = useState(false);
  const newRef = useRef(null);

  const add = () => {
    const v = newRef.current?.value || "";
    if(!v.trim()) return;
    setItems(p=>[...p, { id:Date.now(), label:v.trim(), done:false, createdAt:todayStr() }]);
    if(newRef.current) newRef.current.value = "";
  };
  const toggle = id => setItems(p=>p.map(t=>t.id===id?{...t,done:!t.done,doneAt:t.done?null:todayStr()}:t));
  const remove = id => setItems(p=>p.filter(t=>t.id!==id));

  const active = items.filter(t=>!t.done);
  const done   = items.filter(t=>t.done);

  const bS = bg => ({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={()=>{onSave(items);onClose();}}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div>
            <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📌 中長期タスク</div>
            <div style={{fontSize:11,color:"#6b7a99"}}>週をまたいで管理するタスク</div>
          </div>
          <button style={bS("#4f9eff")} onClick={()=>{onSave(items);onClose();}}>保存</button>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:8,margin:"12px 0"}}>
          <div style={{flex:1,background:"#161920",borderRadius:8,padding:"8px 10px",textAlign:"center",border:"1px solid #2a2f3d"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#4f9eff"}}>{active.length}</div>
            <div style={{fontSize:10,color:"#6b7a99"}}>進行中</div>
          </div>
          <div style={{flex:1,background:"#161920",borderRadius:8,padding:"8px 10px",textAlign:"center",border:"1px solid #2a2f3d"}}>
            <div style={{fontSize:18,fontWeight:800,color:"#34d399"}}>{done.length}</div>
            <div style={{fontSize:10,color:"#6b7a99"}}>完了済み</div>
          </div>
        </div>

        {/* Add input */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <input ref={newRef} style={{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"9px 12px",color:"#e8ecf4",fontSize:BASE_FONT-1,outline:"none",flex:1}} placeholder="新しいタスクを追加..." onKeyDown={e=>e.key==="Enter"&&add()}/>
          <button style={bS("#34d399")} onClick={add}>追加</button>
        </div>

        <div style={{overflowY:"auto",flex:1}}>
          {/* Active tasks */}
          {active.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:16,fontSize:BASE_FONT-1}}>進行中のタスクはありません</div>}
          {active.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid #2a2f3d"}}>
              <div onClick={()=>toggle(t.id)} style={{width:20,height:20,borderRadius:5,flexShrink:0,border:"2px solid #3d4560",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:BASE_FONT-1,fontWeight:600}}>{t.label}</div>
                <div style={{fontSize:10,color:"#3d4560",marginTop:2}}>追加: {t.createdAt}</div>
              </div>
              <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:"#3d4560",cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
            </div>
          ))}

          {/* Done section */}
          {done.length>0&&(
            <div style={{marginTop:16}}>
              <button onClick={()=>setShowDone(v=>!v)} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700,padding:"4px 0",display:"flex",alignItems:"center",gap:6}}>
                {showDone?"▼":"▶"} 完了済み ({done.length}件)
              </button>
              {showDone&&done.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:"1px solid #2a2f3d",opacity:0.5}}>
                  <div onClick={()=>toggle(t.id)} style={{width:20,height:20,borderRadius:5,flexShrink:0,border:"2px solid #34d399",background:"#34d399",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"#fff",fontSize:12}}>✓</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT-1,fontWeight:600,textDecoration:"line-through"}}>{t.label}</div>
                    <div style={{fontSize:10,color:"#3d4560",marginTop:2}}>完了: {t.doneAt}</div>
                  </div>
                  <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:"#3d4560",cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>{onSave(items);onClose();}} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:12}}>閉じる</button>
      </div>
    </div>
  );
}

// ─── Weekly Template Manager ──────────────────────────────────────────────────
function WeeklyTemplateManager({ templates, onSave, onClose }) {
  const [tpls, setTpls] = useState(templates.map(t=>({...t, days:[...t.days]})));
  const [newLabel, setNewLabel] = useState("");
  const newRef = useRef(null);

  const toggleDay = (idx, day) => {
    setTpls(p=>p.map((t,i)=>i===idx?{...t,days:t.days.includes(day)?t.days.filter(d=>d!==day):[...t.days,day].sort()}:t));
  };
  const remove = idx => setTpls(p=>p.filter((_,i)=>i!==idx));
  const add = () => {
    const v = newRef.current?.value || "";
    if(!v.trim()) return;
    setTpls(p=>[...p,{label:v.trim(),days:[0,1,2,3,4]}]);
    if(newRef.current) newRef.current.value="";
  };

  const iS={background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 10px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",flex:1};
  const bS=bg=>({padding:"6px 10px",borderRadius:7,border:"none",background:bg,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11});

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>⚙ 毎週タスクを編集</div>
          <button style={bS("#4f9eff")} onClick={()=>onSave(tpls)}>保存して閉じる</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {tpls.map((t,idx)=>(
            <div key={idx} style={{background:"#161920",borderRadius:10,padding:10,marginBottom:8,border:"1px solid #2a2f3d"}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
                <input style={{...iS,flex:1}} value={t.label} onChange={e=>setTpls(p=>p.map((x,i)=>i===idx?{...x,label:e.target.value}:x))}/>
                <button style={{...bS("#f87171"),padding:"6px 8px"}} onClick={()=>remove(idx)}>✕</button>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {DAYS_LABEL.map((d,di)=>{
                  const on=t.days.includes(di);
                  return <button key={di} onClick={()=>toggleDay(idx,di)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${on?"#4f9eff":"#2a2f3d"}`,background:on?"rgba(79,158,255,0.2)":"transparent",color:on?"#4f9eff":"#6b7a99",cursor:"pointer",fontSize:10,fontWeight:700}}>{d}</button>;
                })}
              </div>
            </div>
          ))}
          {/* Add new */}
          <div style={{background:"#161920",borderRadius:10,padding:10,border:"1px dashed #2a2f3d",marginBottom:8}}>
            <div style={{fontSize:10,color:"#6b7a99",marginBottom:6}}>新しい毎週タスクを追加</div>
            <div style={{display:"flex",gap:6}}>
              <input ref={newRef} style={iS} placeholder="タスク名" onKeyDown={e=>e.key==="Enter"&&add()}/>
              <button style={bS("#34d399")} onClick={add}>追加</button>
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-1,paddingTop:10}}>キャンセル</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState("task");
  const [categories,   setCategories]   = useState(()=>LS.get("tf_categories",   DEFAULT_CATS));
  const [selectedCat,  setSelectedCat]  = useState(()=>LS.get("tf_selectedCat",  DEFAULT_CATS[0].id));
  const [studyCatId,   setStudyCatId]   = useState(()=>LS.get("tf_studyCatId",   "study"));
  const [showCatMgr,   setShowCatMgr]   = useState(false);
  const [showBackup,   setShowBackup]   = useState(false);
  const [showWeeklyMgr,setShowWeeklyMgr]= useState(false);
  const [weeklyTemplates,setWeeklyTemplates]=useState(()=>LS.get("tf_weeklyTpls", WEEKLY_DEFAULTS));
  const [longTermTasks, setLongTermTasks] = useState(()=>LS.get("tf_longTerm", []));
  const [showLongTerm,  setShowLongTerm]  = useState(false);
  const [splash,        setSplash]        = useState(true);
  const [weeklyTasks,  setWeeklyTasks]  = useState(()=>LS.get("tf_weeklyTasks",  buildWeeklyTasks(WEEKLY_DEFAULTS)));
  const [customTasks,  setCustomTasks]  = useState(()=>LS.get("tf_customTasks",  Object.fromEntries(DAYS_LABEL.map((_,i)=>[i,[]]))));
  const [addingDay,    setAddingDay]    = useState(null);
  const [movePopup,    setMovePopup]    = useState(null);
  const [mode,         setMode]         = useState("timer");
  const [pomoDuration, setPomoDuration] = useState(25);
  const [elapsed,      setElapsed]      = useState(0);
  const [running,      setRunning]      = useState(false);
  const [logs,         setLogs]         = useState(()=>LS.get("tf_logs",         []));
  const [editingLog,   setEditingLog]   = useState(null);
  const [diaries,      setDiaries]      = useState(()=>LS.get("tf_diaries",      {}));
  const [diaryModal,   setDiaryModal]   = useState(null);
  const [showDiaryList,setShowDiaryList]= useState(false);
  const [goalHours,    setGoalHours]    = useState(()=>LS.get("tf_goalHours",    10));
  const [logSelectedDay, setLogSelectedDay] = useState(todayDayIdx());

  const intervalRef=useRef(null), startTimeRef=useRef(null), baseElapsedRef=useRef(0);
  const sessionStartRef=useRef(null); // wall-clock start time for startHour
  const pomoDone=mode==="pomodoro"&&elapsed>=pomoDuration*60;

  // Persist
  useEffect(()=>LS.set("tf_categories",  categories),  [categories]);
  useEffect(()=>LS.set("tf_selectedCat", selectedCat), [selectedCat]);
  useEffect(()=>LS.set("tf_weeklyTasks", weeklyTasks), [weeklyTasks]);
  useEffect(()=>LS.set("tf_customTasks", customTasks), [customTasks]);
  useEffect(()=>LS.set("tf_logs",        logs),        [logs]);
  useEffect(()=>LS.set("tf_diaries",     diaries),     [diaries]);
  useEffect(()=>LS.set("tf_longTerm",    longTermTasks), [longTermTasks]);
  useEffect(()=>LS.set("tf_studyCatId",  studyCatId),  [studyCatId]);

  // Splash screen: show for 2 seconds on first load
  useEffect(()=>{ const t=setTimeout(()=>setSplash(false), 2000); return ()=>clearTimeout(t); },[]);

  const saveWeeklyTemplates = (tpls) => {
    setWeeklyTemplates(tpls);
    // Rebuild weeklyTasks from new templates (keep done states where possible)
    setWeeklyTasks(prev => {
      const next = buildWeeklyTasks(tpls);
      // Carry over done state
      DAYS_LABEL.forEach((_,i)=>{
        next[i] = next[i].map(t=>{
          const old = (prev[i]||[]).find(o=>o.id===t.id);
          return old ? {...t, done:old.done} : t;
        });
      });
      return next;
    });
    setShowWeeklyMgr(false);
  };

  useEffect(()=>{
    if("Notification" in window&&Notification.permission==="default") Notification.requestPermission();
  },[]);

  useEffect(()=>{
    if(running){
      if(!sessionStartRef.current) sessionStartRef.current=new Date();
      startTimeRef.current=Date.now();
      intervalRef.current=setInterval(()=>{
        const ne=baseElapsedRef.current+Math.floor((Date.now()-startTimeRef.current)/1000);
        setElapsed(ne);
        if(mode==="pomodoro"&&ne===pomoDuration*60) notify("ポモドーロ完了！",`${pomoDuration}分経過！`);
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
    if(total>=5){
      const cat=categories.find(c=>c.id===selectedCat)||categories[0];
      const startHour = sessionStartRef.current
        ? sessionStartRef.current.getHours()+sessionStartRef.current.getMinutes()/60
        : null;
      setLogs(p=>[{id:Date.now(),date:todayStr(),label:cat.name,catId:cat.id,duration:total,mode,startHour},...p]);
    }
    setElapsed(0); baseElapsedRef.current=0; startTimeRef.current=null; sessionStartRef.current=null;
  };

  const catColor=categories.find(c=>c.id===selectedCat)?.color||"#4f9eff";
  const todayTotal=logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);

  const toggleTask=(dayIdx,id,weekly)=>{
    if(weekly) setWeeklyTasks(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)}));
    else       setCustomTasks(p=>({...p,[dayIdx]:p[dayIdx].map(t=>t.id===id?{...t,done:!t.done}:t)}));
  };
  const moveTask=toDay=>{
    if(!movePopup) return;
    const {task,fromDay}=movePopup;
    if(task.weekly) setWeeklyTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    else            setCustomTasks(p=>({...p,[fromDay]:p[fromDay].filter(t=>t.id!==task.id)}));
    setCustomTasks(p=>({...p,[toDay]:[...p[toDay],{...task,id:Date.now(),weekly:false}]}));
    setMovePopup(null);
  };
  const saveDiary=(date,text)=>setDiaries(p=>({...p,[date]:text}));
  const reorderCategories=(newOrder)=>setCategories(newOrder);

  const S={
    app:{minHeight:"100vh",background:"#0d0f14",color:"#e8ecf4",fontFamily:"'Noto Sans JP',sans-serif",fontSize:BASE_FONT,display:"flex",flexDirection:"column"},
    header:{padding:"14px 16px 0",borderBottom:"1px solid #2a2f3d"},
    tabs:{display:"flex",gap:2,marginTop:10},
    tab:a=>({flex:1,padding:"10px 0",fontSize:BASE_FONT-1,fontWeight:700,border:"none",borderBottom:a?`2px solid ${catColor}`:"2px solid transparent",background:"transparent",color:a?catColor:"#3d4560",cursor:"pointer",transition:"all 0.2s"}),
    body:{flex:1,padding:"12px 12px",overflowY:"auto"},
    card:{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:12,marginBottom:10},
    input:{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 10px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",flex:1},
    btn:(bg="#4f9eff")=>({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:BASE_FONT-1,fontWeight:700,cursor:"pointer"}),
    btnSm:(a,c)=>({padding:"5px 10px",fontSize:BASE_FONT-2,fontWeight:700,border:`1px solid ${a?c:"#2a2f3d"}`,borderRadius:20,background:a?`rgba(${hexRgb(c)},0.2)`:"transparent",color:a?c:"#6b7a99",cursor:"pointer"}),
  };

  // ── Task Tab ──────────────────────────────────────────────────────────────
  const TaskTab=()=>{
    const mobile=window.innerWidth<640;
    return (
      <div>
        {/* Timeline bar */}
        <div style={{...S.card,background:"#161920",borderColor:"rgba(79,158,255,0.2)"}}>
          <TimelineBar logs={logs} categories={categories} date={todayStr()}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
            <div>
              <div style={{fontSize:10,color:"#6b7a99"}}>今日の合計</div>
              <div style={{fontSize:20,fontWeight:800,color:catColor,fontFamily:"monospace"}}>{fmtTime(todayTotal)}</div>
              <div style={{fontSize:10,color:"#6b7a99"}}>{fmtHMS(todayTotal)}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowDiaryList(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 10px",cursor:"pointer",color:"#6b7a99",fontSize:BASE_FONT-1,fontWeight:600}}>📔 一覧</button>
              <button onClick={()=>setDiaryModal(todayStr())} style={{background:diaries[todayStr()]?"rgba(251,191,36,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${diaries[todayStr()]?"#fbbf24":"#2a2f3d"}`,borderRadius:8,padding:"7px 10px",cursor:"pointer",color:diaries[todayStr()]?"#fbbf24":"#6b7a99",fontSize:BASE_FONT-1,fontWeight:600}}>
                {diaries[todayStr()]?"📔 今日":"✏️ 日記"}
              </button>
            </div>
          </div>
        </div>

        <div style={{fontSize:BASE_FONT,fontWeight:800,marginBottom:8}}>📋 今週のタスク</div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:8}}>
          {DAYS_LABEL.map((day,i)=>{
            const wt=weeklyTasks[i]||[], ct=customTasks[i]||[], all=[...wt,...ct];
            const done=all.filter(t=>t.done).length, isToday=i===todayDayIdx();
            const dayDate=fmtDate(getDayDate(i)), hasDiary=diaries[dayDate]?.trim();
            return (
              <div key={i} style={{...S.card,padding:10,borderColor:isToday?catColor:"#2a2f3d",background:isToday?`rgba(${hexRgb(catColor)},0.06)`:"#1e2330"}}>
                {/* Header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:BASE_FONT-1,fontWeight:800,color:isToday?catColor:"#94a3b8"}}>{day}</span>
                    <span style={{fontSize:10,color:"#3d4560"}}>{dayDateStr(i)}</span>
                    {/* diary button */}
                    <button onClick={()=>setDiaryModal(dayDate)} style={{
                      background:hasDiary?"rgba(251,191,36,0.2)":"rgba(255,255,255,0.06)",
                      border:`1.5px solid ${hasDiary?"#fbbf24":"#3d4560"}`,
                      borderRadius:8, padding:"3px 8px", cursor:"pointer",
                      fontSize:11, fontWeight:800,
                      color:hasDiary?"#fbbf24":"#6b7a99",
                      lineHeight:"18px", letterSpacing:0.3,
                      boxShadow:hasDiary?"0 0 6px rgba(251,191,36,0.3)":"none",
                    }}>
                      {hasDiary?"📔":"＋日記"}
                    </button>
                  </div>
                  {all.length>0&&<span style={{fontSize:9,fontWeight:700,color:done===all.length?"#34d399":"#6b7a99"}}>{done}/{all.length}</span>}
                </div>
                {all.length===0&&<div style={{fontSize:10,color:"#3d4560",textAlign:"center",padding:"4px 0"}}>—</div>}
                {all.map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 0",borderBottom:"1px solid #2a2f3d",opacity:t.done?0.4:1}}>
                    <button onClick={()=>setMovePopup({task:t,fromDay:i})} style={{background:"none",border:"none",color:"#3d4560",fontSize:14,flexShrink:0,cursor:"pointer",padding:"1px 2px",lineHeight:1}} title="移動">⇄</button>
                    <div onClick={()=>toggleTask(i,t.id,t.weekly)} style={{width:14,height:14,borderRadius:4,flexShrink:0,border:`2px solid ${t.done?"#34d399":"#3d4560"}`,background:t.done?"#34d399":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {t.done&&<span style={{color:"#fff",fontSize:9}}>✓</span>}
                    </div>
                    <span style={{fontSize:BASE_FONT-1,flex:1,lineHeight:1.3}}>{t.label}</span>
                    {t.weekly&&<span style={{fontSize:9,background:"rgba(79,158,255,0.12)",color:"#4f9eff",borderRadius:4,padding:"1px 4px",flexShrink:0}}>毎週</span>}
                  </div>
                ))}
                {addingDay===i
                  ?<TaskInput onAdd={label=>{ setCustomTasks(p=>({...p,[i]:[...p[i],{id:Date.now(),label,done:false}]})); setAddingDay(null); }} onCancel={()=>setAddingDay(null)} inputStyle={{...S.input,fontSize:BASE_FONT-1,padding:"5px 8px"}} btnStyle={S.btn}/>
                  :<button onClick={()=>setAddingDay(i)} style={{width:"100%",background:"none",border:"1px dashed #2a2f3d",borderRadius:6,padding:"5px 0",color:"#3d4560",cursor:"pointer",fontSize:16,marginTop:6}}>+</button>
                }
              </div>
            );
          })}
        </div>
        {/* 毎週タスク編集ボタン */}
        <button onClick={()=>setShowWeeklyMgr(true)} style={{width:"100%",background:"rgba(79,158,255,0.06)",border:"1px solid rgba(79,158,255,0.2)",borderRadius:10,padding:"12px 0",color:"#4f9eff",cursor:"pointer",fontSize:BASE_FONT-1,fontWeight:700,marginTop:4}}>
          ⚙ 毎週タスクを編集
        </button>

        {/* ── 中長期タスク ── */}
        <div style={{marginTop:16,borderTop:"1px dashed #2a2f3d",paddingTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:BASE_FONT,fontWeight:800}}>📌 中長期タスク</div>
              <div style={{fontSize:11,color:"#6b7a99"}}>週をまたいで管理</div>
            </div>
            <button onClick={()=>setShowLongTerm(true)} style={{background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.3)",borderRadius:8,padding:"7px 14px",color:"#fb923c",cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700}}>
              編集 / 追加
            </button>
          </div>
          {/* Active long-term tasks preview */}
          {longTermTasks.filter(t=>!t.done).length===0
            ?<div style={{textAlign:"center",color:"#3d4560",fontSize:BASE_FONT-2,padding:"10px 0"}}>タスクなし　→「編集 / 追加」から追加できます</div>
            :longTermTasks.filter(t=>!t.done).map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#1e2330",borderRadius:8,marginBottom:6,border:"1px solid #2a2f3d"}}>
                <div onClick={()=>setLongTermTasks(p=>p.map(x=>x.id===t.id?{...x,done:true,doneAt:todayStr()}:x))} style={{width:18,height:18,borderRadius:4,flexShrink:0,border:"2px solid #fb923c",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                </div>
                <span style={{fontSize:BASE_FONT-1,flex:1}}>{t.label}</span>
                <span style={{fontSize:10,color:"#3d4560"}}>{t.createdAt}</span>
              </div>
            ))
          }
          {longTermTasks.filter(t=>t.done).length>0&&(
            <div style={{fontSize:11,color:"#34d399",textAlign:"right",marginTop:4}}>
              ✓ 完了済み {longTermTasks.filter(t=>t.done).length}件
            </div>
          )}
        </div>
      </div>
    );
  };
  const TimerTab=()=>(
    <div style={running?{position:"fixed",inset:0,zIndex:88,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}:{maxWidth:400,margin:"0 auto"}}>
      {!running&&(
        <>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
            {["timer","pomodoro"].map(m=><button key={m} style={S.btnSm(mode===m,catColor)} onClick={()=>{setMode(m);setElapsed(0);baseElapsedRef.current=0;}}>{m==="timer"?"⏱ タイマー":"🍅 ポモドーロ"}</button>)}
          </div>
          <CategoryDial categories={categories} selected={selectedCat} onSelect={setSelectedCat} disabled={false}/>
          <div style={{textAlign:"center",marginBottom:10}}>
            <button style={{background:"none",border:"none",color:"#3d4560",fontSize:BASE_FONT-2,cursor:"pointer"}} onClick={()=>setShowCatMgr(true)}>⚙ カテゴリーを管理</button>
          </div>
          {mode==="pomodoro"&&(
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {[15,25,45,60].map(m=><button key={m} style={S.btnSm(pomoDuration===m,"#fb923c")} onClick={()=>{setPomoDuration(m);setElapsed(0);baseElapsedRef.current=0;}}>{m}分</button>)}
            </div>
          )}
        </>
      )}
      {running&&<div style={{fontSize:11,color:"#6b7a99",marginBottom:6,letterSpacing:2,textTransform:"uppercase"}}>計測中</div>}
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={running} color={catColor}/>
      </div>
      {pomoDone&&<div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:10,padding:10,textAlign:"center",marginBottom:12,fontSize:BASE_FONT,color:"#34d399",fontWeight:700}}>🎉 {pomoDuration}分完了！計測は継続中</div>}
      {running&&(
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:BASE_FONT-1,color:"#6b7a99"}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          <div style={{fontSize:BASE_FONT-1,color:"#6b7a99",marginTop:4}}>{fmtHMS(elapsed)}</div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"center",gap:10}}>
        {!running
          ?<button style={{...S.btn("#34d399"),padding:"14px 48px",fontSize:16,borderRadius:50}} onClick={()=>{setRunning(true);setTab("timer");}}>▶ 開始</button>
          :<>
            <button style={{...S.btn("#fb923c"),padding:"14px 28px",fontSize:15,borderRadius:50}} onClick={()=>setRunning(false)}>⏸ 一時停止</button>
            <button style={{...S.btn("#f87171"),padding:"14px 24px",fontSize:15,borderRadius:50}} onClick={handleStop}>■ 終了・記録</button>
          </>
        }
      </div>
      {!running&&elapsed>0&&<div style={{textAlign:"center",marginTop:12,color:"#6b7a99",fontSize:BASE_FONT-1}}>経過: <span style={{color:"#e8ecf4",fontWeight:700,fontFamily:"monospace"}}>{fmtTime(elapsed)}</span> ({fmtHMS(elapsed)})</div>}
    </div>
  );

  // ── Log Tab ───────────────────────────────────────────────────────────────
  const LogTab=()=>{
    const [editGoal,setEditGoal]=useState(false);
    const [gInput,setGInput]=useState(String(goalHours));
    const byDate={};
    logs.forEach(l=>{ if(!byDate[l.date]) byDate[l.date]=[]; byDate[l.date].push(l); });
    const dates=Object.keys(byDate).sort().reverse();
    return (
      <div>
        <WeeklyProgress weeklyTasks={weeklyTasks} customTasks={customTasks} logs={logs} diaries={diaries} goalHours={goalHours} onSelectDay={setLogSelectedDay} selectedDay={logSelectedDay} studyCatId={studyCatId}/>
        {/* Study cat + goal settings */}
        <div style={{...S.card,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:BASE_FONT-2,color:"#6b7a99"}}>目標対象カテゴリー</span>
            <select value={studyCatId} onChange={e=>setStudyCatId(e.target.value)} style={{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"5px 10px",color:"#e8ecf4",fontSize:BASE_FONT-2,outline:"none"}}>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:BASE_FONT-2,color:"#6b7a99"}}>週間目標時間</span>
            {editGoal
              ?<div style={{display:"flex",gap:6,alignItems:"center"}}><input style={{...S.input,width:54,textAlign:"center"}} type="number" min="1" value={gInput} onChange={e=>setGInput(e.target.value)}/><span style={{color:"#6b7a99",fontSize:BASE_FONT-2}}>時間</span><button style={S.btn()} onClick={()=>{setGoalHours(Math.max(1,Number(gInput)));setEditGoal(false);}}>✓</button></div>
              :<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"monospace",fontSize:14,fontWeight:800,color:"#34d399"}}>{goalHours}h</span><button style={{...S.btn("#2a2f3d"),padding:"5px 10px",fontSize:BASE_FONT-2}} onClick={()=>setEditGoal(true)}>変更</button></div>
            }
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:BASE_FONT+1,fontWeight:800}}>📊 記録</span>
          <button onClick={()=>setShowDiaryList(true)} style={{background:"rgba(251,191,36,0.1)",border:"1px solid #fbbf2440",borderRadius:8,padding:"5px 10px",color:"#fbbf24",fontSize:BASE_FONT-2,cursor:"pointer",fontWeight:600}}>📔 日記一覧</button>
        </div>
        {logs.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:40,fontSize:BASE_FONT}}>記録がありません。<br/>タイマーで計測を始めましょう！</div>}
        {dates.map(date=>{
          const dl=byDate[date], total=dl.reduce((s,l)=>s+l.duration,0);
          const byCat={}; dl.forEach(l=>{ byCat[l.catId]=(byCat[l.catId]||0)+l.duration; });
          return (
            <div key={date} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:BASE_FONT,fontWeight:800,color:catColor}}>{date}</span>
                  {diaries[date]?.trim()&&<button onClick={()=>setDiaryModal(date)} style={{background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf24",borderRadius:6,padding:"2px 7px",color:"#fbbf24",fontSize:10,cursor:"pointer",fontWeight:700}}>📔</button>}
                </div>
                <span style={{fontSize:BASE_FONT-1,color:"#34d399",fontWeight:700}}>{fmtHMS(total)}</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"#1e2330",display:"flex",overflow:"hidden",marginBottom:8}}>
                {Object.entries(byCat).map(([cid,dur])=>{ const cat=categories.find(c=>c.id===cid); return <div key={cid} style={{width:`${(dur/86400)*100}%`,background:cat?.color||"#6b7a99",minWidth:dur>60?2:0}}/>; })}
              </div>
              {dl.map(l=>{ const cat=categories.find(c=>c.id===l.catId); return (
                <div key={l.id} style={{...S.card,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:cat?.color||"#6b7a99",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT,fontWeight:700}}>{l.label}</div>
                    <div style={{fontSize:10,color:"#6b7a99",marginTop:1}}>{l.mode==="pomodoro"?"🍅":"⏱"}{cat&&<span style={{marginLeft:4,color:cat.color}}>#{cat.name}</span>}{l.startHour!=null&&<span style={{marginLeft:6,color:"#3d4560"}}>{Math.floor(l.startHour)}:{pad(Math.round((l.startHour%1)*60))}〜</span>}</div>
                  </div>
                  <div style={{fontSize:BASE_FONT-1,fontWeight:800,color:"#e8ecf4",textAlign:"right"}}>
                    <div style={{fontFamily:"monospace"}}>{fmtTime(l.duration)}</div>
                    <div style={{fontSize:10,color:"#6b7a99"}}>{fmtHMS(l.duration)}</div>
                  </div>
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
      {/* ── Splash Screen ── */}
      {splash&&(
        <div style={{position:"fixed",inset:0,zIndex:999,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 0.5s",opacity:1}}>
          {/* Animated ring */}
          <svg width="100" height="100" viewBox="0 0 100 100" style={{marginBottom:24}}>
            <defs>
              <filter id="sp-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#1e2330" strokeWidth="6"/>
            <circle cx="50" cy="50" r="38" fill="none" stroke="#4f9eff" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2*Math.PI*38} strokeDashoffset={2*Math.PI*38*0.25}
              transform="rotate(-90 50 50)" filter="url(#sp-glow)"
              style={{animation:"spin 1.4s linear infinite"}}/>
            {/* Check icon */}
            <polyline points="30,52 44,66 70,38" fill="none" stroke="#4f9eff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#sp-glow)"/>
            <style>{`@keyframes spin{from{stroke-dashoffset:${2*Math.PI*38}}to{stroke-dashoffset:${-2*Math.PI*38}}}`}</style>
          </svg>
          <div style={{fontSize:28,fontWeight:900,color:"#e8ecf4",letterSpacing:"-0.5px",marginBottom:6}}>TimeFlow</div>
          <div style={{fontSize:13,color:"#6b7a99",letterSpacing:2}}>タスク & 時間管理</div>
        </div>
      )}
      {/* Full-screen timer when running and not on timer tab */}
      {running&&tab!=="timer"&&(
        <div style={{position:"fixed",inset:0,zIndex:90,background:"#0d0f14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:11,color:"#6b7a99",marginBottom:8,letterSpacing:2}}>計測中</div>
          <RingTimer elapsed={elapsed} total={mode==="pomodoro"?pomoDuration*60:0} running={true} color={catColor}/>
          <div style={{marginTop:8,fontSize:BASE_FONT-1,color:"#6b7a99"}}>カテゴリー: <span style={{color:catColor,fontWeight:700}}>{categories.find(c=>c.id===selectedCat)?.name}</span></div>
          <div style={{marginTop:4,fontSize:BASE_FONT-1,color:"#6b7a99"}}>{fmtHMS(elapsed)}</div>
          <div style={{display:"flex",gap:12,marginTop:28}}>
            <button style={{...S.btn("#fb923c"),padding:"14px 28px",fontSize:15,borderRadius:50}} onClick={()=>setRunning(false)}>⏸ 一時停止</button>
            <button style={{...S.btn("#f87171"),padding:"14px 24px",fontSize:15,borderRadius:50}} onClick={()=>{handleStop();setTab("timer");}}>■ 終了・記録</button>
          </div>
          <button style={{marginTop:20,background:"none",border:"none",color:"#4f9eff",cursor:"pointer",fontSize:BASE_FONT,fontWeight:600}} onClick={()=>setTab("timer")}>タイマー画面へ →</button>
        </div>
      )}

      <div style={S.header}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontSize:17,fontWeight:900,letterSpacing:"-0.5px"}}>TimeFlow</div><div style={{fontSize:10,color:"#6b7a99"}}>タスク & 時間管理</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setShowBackup(true)} style={{background:"none",border:"none",color:"#3d4560",fontSize:18,cursor:"pointer",padding:2}}>💾</button>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
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

      {showLongTerm&&<LongTermModal tasks={longTermTasks} onSave={setLongTermTasks} onClose={()=>setShowLongTerm(false)}/>}
      {showWeeklyMgr&&<WeeklyTemplateManager templates={weeklyTemplates} onSave={saveWeeklyTemplates} onClose={()=>setShowWeeklyMgr(false)}/>}
      {showCatMgr&&<CatManagerModal categories={categories} onChange={c=>{setCategories(c);if(!c.find(x=>x.id===selectedCat))setSelectedCat(c[0]?.id);}} onClose={()=>setShowCatMgr(false)}/>}
      {editingLog&&<EditLogModal log={editingLog} categories={categories} onSave={u=>{setLogs(p=>p.map(l=>l.id===u.id?u:l));setEditingLog(null);}} onClose={()=>setEditingLog(null)}/>}
      {diaryModal&&<DiaryModal date={diaryModal} diary={diaries[diaryModal]} onSave={t=>saveDiary(diaryModal,t)} onClose={()=>setDiaryModal(null)}/>}
      {showDiaryList&&<DiaryListModal diaries={diaries} onOpen={d=>{setShowDiaryList(false);setDiaryModal(d);}} onClose={()=>setShowDiaryList(false)}/>}
      {movePopup&&<MoveTaskPopup task={movePopup.task} fromDay={movePopup.fromDay} onMove={moveTask} onClose={()=>setMovePopup(null)}/>}
      {showBackup&&<BackupModal data={{categories,weeklyTasks,customTasks,logs,diaries,goalHours,exportedAt:new Date().toISOString()}} onRestore={p=>{if(p.categories)setCategories(p.categories);if(p.weeklyTasks)setWeeklyTasks(p.weeklyTasks);if(p.customTasks)setCustomTasks(p.customTasks);if(p.logs)setLogs(p.logs);if(p.diaries)setDiaries(p.diaries);if(p.goalHours)setGoalHours(p.goalHours);}} onClose={()=>setShowBackup(false)}/>}
    </div>
  );
}

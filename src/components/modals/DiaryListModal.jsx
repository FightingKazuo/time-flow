import { useState } from "react";
import { BASE_FONT } from "../../constants";
import { DIARY_COLORS } from "./DiaryModal";

export default function DiaryListModal({ diaries, onOpen, onClose }) {
  const [filter, setFilter] = useState("all");

  const entries = Object.entries(diaries)
    .filter(([,d]) => {
      const text = typeof d==="object"?d?.text:d;
      return text?.trim();
    })
    .sort((a,b) => b[0].localeCompare(a[0]));

  const filtered = filter==="all" ? entries
    : entries.filter(([,d]) => {
        const c = typeof d==="object" ? (d?.color||"none") : "none";
        return c === filter;
      });

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:24,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column",paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📔 日記一覧</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",fontSize:20,cursor:"pointer"}}>×</button>
        </div>

        {/* 色フィルタ */}
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4,scrollbarWidth:"none"}}>
          <button onClick={()=>setFilter("all")} style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:`1px solid ${filter==="all"?"#4f9eff":"#2a2f3d"}`,background:filter==="all"?"rgba(79,158,255,0.12)":"transparent",color:filter==="all"?"#4f9eff":"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700}}>すべて</button>
          {DIARY_COLORS.filter(c=>c.id!=="none").map(c=>(
            <button key={c.id} onClick={()=>setFilter(c.id)} style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:`1px solid ${filter===c.id?c.color:"#2a2f3d"}`,background:filter===c.id?`${c.color}22`:"transparent",color:filter===c.id?c.color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700,whiteSpace:"nowrap"}}>{c.label}</button>
          ))}
        </div>

        <div style={{overflowY:"auto",flex:1}}>
          {filtered.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:40}}>日記がありません</div>}
          {filtered.map(([date,d])=>{
            const text  = typeof d==="object"?d?.text:d;
            const color = typeof d==="object"?(d?.color||"none"):"none";
            const dc    = DIARY_COLORS.find(c=>c.id===color);
            return (
              <div key={date} onClick={()=>onOpen(date)}
                style={{padding:"12px 0",borderBottom:"1px solid #2a2f3d",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  {color!=="none"&&<div style={{width:10,height:10,borderRadius:"50%",background:dc?.color,flexShrink:0}}/>}
                  <span style={{fontSize:BASE_FONT-1,fontWeight:700,color:dc?.color||"#4f9eff"}}>{date}</span>
                </div>
                <div style={{fontSize:BASE_FONT-2,color:"#94a3b8",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                  {text?.slice(0,60)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { BASE_FONT, DAYS_LABEL, PRESET_COLORS, WEEKLY_DEFAULTS, todayStr, dayDateStr, hexRgb, fmtHM, fmtHMS, pad } from "../../constants";

export default function MoveTaskPopup({ task, fromDay, onMove, onClose }) {
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



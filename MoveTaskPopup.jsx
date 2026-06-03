import { useState, useRef, useEffect } from "react";
import { BASE_FONT, DAYS_LABEL, PRESET_COLORS, WEEKLY_DEFAULTS, todayStr, dayDateStr, hexRgb, fmtHM, fmtHMS, pad } from "../../constants";

export default function DiaryModal({ date, diary, onSave, onClose }) {
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



import { useState } from "react";
import { BASE_FONT, hexRgb } from "../../constants";

export default function EditLogModal({ log, categories, onSave, onClose }) {
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


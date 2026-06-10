import { BASE_FONT, DAYS_LABEL, dayDateStr } from "../../constants";

export default function MoveTaskPopup({ task, fromDay, onMove, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const muted  = t.muted  || "#3d4560";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:BASE_FONT+1,fontWeight:800,marginBottom:4,color:text}}>タスクを移動</div>
        <div style={{fontSize:BASE_FONT-1,color:sub,marginBottom:16}}>「{task.label}」をどの曜日に移動？</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {DAYS_LABEL.map((d,i)=>(
            <button key={i} disabled={i===fromDay} onClick={()=>onMove(i)} style={{
              padding:"12px 8px",borderRadius:10,
              border:`1px solid ${i===fromDay?muted:border}`,
              background:i===fromDay?card2:card,
              color:i===fromDay?muted:text,
              cursor:i===fromDay?"not-allowed":"pointer",
              fontWeight:700,fontSize:BASE_FONT,
            }}>
              <div style={{fontSize:10,color:sub,marginBottom:2}}>{dayDateStr(i)}</div>
              {d}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{width:"100%",marginTop:12,background:"none",border:"none",color:sub,cursor:"pointer",fontSize:BASE_FONT-1}}>キャンセル</button>
      </div>
    </div>
  );
}

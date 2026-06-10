import { useState } from "react";
import { BASE_FONT, DAYS_LABEL } from "../../constants";

export default function WeekHistoryModal({ history, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const bg     = t.bg     || "#0d0f14";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const muted  = t.muted  || "#3d4560";
  const accent = t.accent || "#4f8ef7";

  const [selected, setSelected] = useState(null);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:20,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800,color:text}}>📅 週間履歴</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:sub,fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        {history.length===0&&<div style={{textAlign:"center",color:sub,padding:32,fontSize:BASE_FONT}}>まだ履歴がありません</div>}
        <div style={{overflowY:"auto",flex:1}}>
          {history.map((w,i)=>{
            const allTasks = [...Object.values(w.weeklyTasks||{}).flat(), ...Object.values(w.customTasks||{}).flat()];
            const done  = allTasks.filter(t=>t.done).length;
            const total = allTasks.length;
            const pct   = total>0 ? Math.round(done/total*100) : 0;
            const isOpen = selected===i;
            return (
              <div key={i} style={{marginBottom:8}}>
                <div onClick={()=>setSelected(isOpen?null:i)} style={{background:card2,borderRadius:10,border:`1px solid ${isOpen?accent:border}`,padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:BASE_FONT-2,fontWeight:800,color:accent}}>{w.weekLabel}</div>
                    <div style={{fontSize:11,color:sub,marginTop:2}}>タスク達成: {done}/{total} ({pct}%)</div>
                  </div>
                  <span style={{color:muted,fontSize:12}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{background:bg,borderRadius:"0 0 10px 10px",border:`1px solid ${border}`,borderTop:"none",padding:12}}>
                    {DAYS_LABEL.map((day,di)=>{
                      const wt  = (w.weeklyTasks||{})[di]||[];
                      const ct  = (w.customTasks||{})[di]||[];
                      const all = [...wt,...ct];
                      if(all.length===0) return null;
                      return (
                        <div key={di} style={{marginBottom:8}}>
                          <div style={{fontSize:11,fontWeight:700,color:sub,marginBottom:4}}>{day}</div>
                          {all.map((task,ti)=>(
                            <div key={ti} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0"}}>
                              <div style={{width:12,height:12,borderRadius:3,background:task.done?"#34d399":"transparent",border:`1.5px solid ${task.done?"#34d399":muted}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {task.done&&<span style={{color:"#fff",fontSize:8}}>✓</span>}
                              </div>
                              <span style={{fontSize:BASE_FONT-3,color:task.done?sub:muted,textDecoration:task.done?"line-through":"none"}}>{task.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

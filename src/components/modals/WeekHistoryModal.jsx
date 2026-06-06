import { useState } from "react";
import { BASE_FONT, DAYS_LABEL, fmtHM } from "../../constants";

export default function WeekHistoryModal({ history, onClose }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📅 週間履歴</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        {history.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:32,fontSize:BASE_FONT}}>まだ履歴がありません</div>}
        <div style={{overflowY:"auto",flex:1}}>
          {history.map((w,i)=>{
            const allTasks = [...Object.values(w.weeklyTasks||{}).flat(), ...Object.values(w.customTasks||{}).flat()];
            const done = allTasks.filter(t=>t.done).length;
            const total = allTasks.length;
            const pct = total>0?Math.round(done/total*100):0;
            const isOpen = selected===i;
            return (
              <div key={i} style={{marginBottom:8}}>
                <div onClick={()=>setSelected(isOpen?null:i)} style={{background:"#161920",borderRadius:10,border:`1px solid ${isOpen?"#4f9eff":"#2a2f3d"}`,padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:BASE_FONT-2,fontWeight:800,color:"#4f9eff"}}>{w.weekLabel}</div>
                    <div style={{fontSize:11,color:"#6b7a99",marginTop:2}}>タスク達成: {done}/{total} ({pct}%)</div>
                  </div>
                  <span style={{color:"#3d4560",fontSize:12}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{background:"#0d0f14",borderRadius:"0 0 10px 10px",border:"1px solid #2a2f3d",borderTop:"none",padding:12}}>
                    {DAYS_LABEL.map((day,di)=>{
                      const wt = (w.weeklyTasks||{})[di]||[];
                      const ct = (w.customTasks||{})[di]||[];
                      const all = [...wt,...ct];
                      if(all.length===0) return null;
                      return (
                        <div key={di} style={{marginBottom:8}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#6b7a99",marginBottom:4}}>{day}</div>
                          {all.map((t,ti)=>(
                            <div key={ti} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 0"}}>
                              <div style={{width:12,height:12,borderRadius:3,background:t.done?"#34d399":"transparent",border:`1.5px solid ${t.done?"#34d399":"#3d4560"}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                {t.done&&<span style={{color:"#fff",fontSize:8}}>✓</span>}
                              </div>
                              <span style={{fontSize:BASE_FONT-3,color:t.done?"#94a3b8":"#6b7a99",textDecoration:t.done?"line-through":"none"}}>{t.label}</span>
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

// ─── Long-Term Task Modal (with groups & deadlines) ───────────────────────────


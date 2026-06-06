import { useState, useRef } from "react";
import { BASE_FONT, DAYS_LABEL, WEEKLY_DEFAULTS } from "../../constants";

export default function WeeklyTemplateManager({ templates, onSave, onClose }) {
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
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



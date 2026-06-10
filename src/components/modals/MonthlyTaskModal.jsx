import { useState } from "react";
import { BASE_FONT, DAYS_LABEL } from "../../constants";

const WEEK_NUMS = ["第1","第2","第3","第4","第5"];

export default function MonthlyTaskModal({ tasks, onSave, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const accent = t.accent || "#4f8ef7";

  const [items,      setItems]      = useState(tasks.map(t=>({...t})));
  const [mode,       setMode]       = useState("weekday");
  const [newLabel,   setNewLabel]   = useState("");
  const [newWeekNum, setNewWeekNum] = useState(1);
  const [newWeekDay, setNewWeekDay] = useState(0);
  const [newDate,    setNewDate]    = useState(1);

  const iS = {background:card2,border:`1px solid ${border}`,borderRadius:8,padding:"8px 10px",color:text,fontSize:BASE_FONT-2,outline:"none"};
  const bS = bg => ({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2});

  const add = () => {
    if(!newLabel.trim()) return;
    const task = mode==="weekday"
      ? { id:Date.now(), label:newLabel.trim(), type:"weekday", weekNum:newWeekNum, weekDay:newWeekDay }
      : { id:Date.now(), label:newLabel.trim(), type:"date",    monthDay:newDate };
    setItems(p=>[...p, task]);
    setNewLabel("");
  };

  const describeTask = t => t.type==="weekday"
    ? `${WEEK_NUMS[t.weekNum-1]}${DAYS_LABEL[t.weekDay]}曜日`
    : `毎月${t.monthDay}日`;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={()=>{onSave(items);onClose();}}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:20,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800,color:text}}>🗓 マンスリータスク</div>
          <button style={bS(accent)} onClick={()=>{onSave(items);onClose();}}>保存</button>
        </div>

        <div style={{background:card2,borderRadius:10,padding:12,marginBottom:12,border:`1px solid ${border}`}}>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <button onClick={()=>setMode("weekday")} style={{flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${mode==="weekday"?accent:border}`,background:mode==="weekday"?"rgba(79,142,247,0.12)":"transparent",color:mode==="weekday"?accent:sub,cursor:"pointer",fontWeight:700,fontSize:BASE_FONT-3}}>第○曜日</button>
            <button onClick={()=>setMode("date")}    style={{flex:1,padding:"7px 0",borderRadius:8,border:`1px solid ${mode==="date"?accent:border}`,background:mode==="date"?"rgba(79,142,247,0.12)":"transparent",color:mode==="date"?accent:sub,cursor:"pointer",fontWeight:700,fontSize:BASE_FONT-3}}>毎月○日</button>
          </div>
          <input style={{...iS,width:"100%",boxSizing:"border-box",marginBottom:8}} placeholder="タスク名" value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          {mode==="weekday"?(
            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
              <select value={newWeekNum} onChange={e=>setNewWeekNum(Number(e.target.value))} style={{...iS,flex:1}}>
                {WEEK_NUMS.map((w,i)=><option key={i} value={i+1}>{w}</option>)}
              </select>
              <select value={newWeekDay} onChange={e=>setNewWeekDay(Number(e.target.value))} style={{...iS,flex:1}}>
                {DAYS_LABEL.map((d,i)=><option key={i} value={i}>{d}曜日</option>)}
              </select>
            </div>
          ):(
            <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
              <span style={{color:sub,fontSize:BASE_FONT-2}}>毎月</span>
              <input type="number" min="1" max="31" value={newDate} onChange={e=>setNewDate(Number(e.target.value))} style={{...iS,width:70,textAlign:"center"}}/>
              <span style={{color:sub,fontSize:BASE_FONT-2}}>日</span>
            </div>
          )}
          <button style={{...bS("#34d399"),width:"100%"}} onClick={add}>＋ 追加</button>
        </div>

        <div style={{overflowY:"auto",flex:1}}>
          {items.length===0&&<div style={{textAlign:"center",color:sub,padding:20,fontSize:BASE_FONT-2}}>マンスリータスクなし</div>}
          {items.map(task=>(
            <div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:`1px solid ${border}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:BASE_FONT-1,fontWeight:600,color:text}}>{task.label}</div>
                <div style={{fontSize:11,color:accent,marginTop:2}}>{describeTask(task)}</div>
              </div>
              <button onClick={()=>setItems(p=>p.filter(x=>x.id!==task.id))} style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={()=>{onSave(items);onClose();}} style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:10,width:"100%"}}>閉じる</button>
      </div>
    </div>
  );
}

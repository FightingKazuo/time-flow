import { useState } from "react";
import { BASE_FONT, DAYS_LABEL, pad } from "../../constants";

export default function CalendarEventModal({ events, onSave, onClose }) {
  const [items, setItems] = useState(events.map(e=>({...e})));
  const [newTitle, setNewTitle] = useState("");
  const [newDate,  setNewDate]  = useState("");
  const [newTime,  setNewTime]  = useState("");
  const [newNote,  setNewNote]  = useState("");

  const iS = {background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"8px 10px",color:"#e8ecf4",fontSize:BASE_FONT-2,outline:"none"};
  const bS = bg => ({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2});

  const add = () => {
    if(!newTitle.trim()||!newDate) return;
    setItems(p=>[...p,{id:Date.now(),title:newTitle.trim(),date:newDate,time:newTime||null,note:newNote.trim()||null}]);
    setNewTitle(""); setNewDate(""); setNewTime(""); setNewNote("");
  };

  const fmt = d => { const dt=new Date(d+"T00:00:00"); return `${dt.getMonth()+1}/${dt.getDate()}（${DAYS_LABEL[dt.getDay()===0?6:dt.getDay()-1]}）`; };

  // 過去の予定を薄く
  const today = new Date(); today.setHours(0,0,0,0);
  const sorted = [...items].sort((a,b)=>a.date.localeCompare(b.date));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={()=>{onSave(items);onClose();}}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📅 カレンダー予定</div>
          <button style={bS("#4f9eff")} onClick={()=>{onSave(items);onClose();}}>保存</button>
        </div>

        {/* 追加フォーム */}
        <div style={{background:"#161920",borderRadius:10,padding:12,marginBottom:12,border:"1px solid #2a2f3d"}}>
          <input style={{...iS,width:"100%",boxSizing:"border-box",marginBottom:8}} placeholder="予定タイトル" value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{...iS,flex:1,colorScheme:"dark"}}/>
            <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{...iS,width:100,colorScheme:"dark"}}/>
          </div>
          <input style={{...iS,width:"100%",boxSizing:"border-box",marginBottom:8}} placeholder="メモ（任意）" value={newNote} onChange={e=>setNewNote(e.target.value)}/>
          <button style={{...bS("#34d399"),width:"100%"}} onClick={add}>＋ 追加</button>
        </div>

        {/* 予定一覧 */}
        <div style={{overflowY:"auto",flex:1}}>
          {sorted.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:20,fontSize:BASE_FONT-2}}>予定なし</div>}
          {sorted.map(e=>{
            const isPast = new Date(e.date+"T23:59:59") < today;
            return (
              <div key={e.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 0",borderBottom:"1px solid #2a2f3d",opacity:isPast?0.4:1}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:BASE_FONT-1,fontWeight:700}}>{e.title}</div>
                  <div style={{fontSize:11,color:"#4f9eff",marginTop:2}}>
                    📅 {fmt(e.date)}{e.time&&<span style={{marginLeft:6}}>⏰ {e.time}</span>}
                  </div>
                  {e.note&&<div style={{fontSize:11,color:"#6b7a99",marginTop:2}}>{e.note}</div>}
                </div>
                <button onClick={()=>setItems(p=>p.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:"#3d4560",cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
              </div>
            );
          })}
        </div>
        <button onClick={()=>{onSave(items);onClose();}} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:10,width:"100%"}}>閉じる</button>
      </div>
    </div>
  );
}

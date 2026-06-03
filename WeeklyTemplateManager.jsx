import { useState, useRef } from "react";
import { BASE_FONT, todayStr } from "../../constants";

export default function LongTermModal({ tasks, onSave, onClose }) {
  const [items, setItems]     = useState(tasks.map(t=>({...t})));
  const [showDone, setShowDone] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newGroup, setNewGroup] = useState("default");
  const [newDeadline, setNewDeadline] = useState("");
  const [editingGroup, setEditingGroup] = useState(false);
  const [groups, setGroups]   = useState(()=>{
    const gs = [...new Set(tasks.map(t=>t.group||"default"))];
    return gs.length ? gs : ["default"];
  });
  const [newGrpName, setNewGrpName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const newRef = useRef(null);

  const add = () => {
    const v = newRef.current?.value || "";
    if(!v.trim()) return;
    setItems(p=>[...p,{id:Date.now(),label:v.trim(),done:false,createdAt:todayStr(),group:newGroup,deadline:newDeadline||null,addedToWeek:false}]);
    if(newRef.current) newRef.current.value="";
    setNewDeadline("");
  };
  const toggle = id => setItems(p=>p.map(t=>t.id===id?{...t,done:!t.done,doneAt:t.done?null:todayStr()}:t));
  const remove = id => setItems(p=>p.filter(t=>t.id!==id));
  const addGroup = () => { if(!newGrpName.trim()) return; setGroups(p=>[...p,newGrpName.trim()]); setNewGrpName(""); };

  const active = items.filter(t=>!t.done && (selectedGroup==="all"||t.group===selectedGroup));
  const done   = items.filter(t=>t.done  && (selectedGroup==="all"||t.group===selectedGroup));

  const isOverdue = t => t.deadline && !t.done && new Date(t.deadline) < new Date();
  const isSoon    = t => t.deadline && !t.done && !isOverdue(t) && (new Date(t.deadline)-new Date()) < 3*86400000;

  const bS = bg => ({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2});
  const iS = {background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"8px 10px",color:"#e8ecf4",fontSize:BASE_FONT-2,outline:"none"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}} onClick={()=>{onSave(items);onClose();}}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"90vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📌 長期タスク</div>
          <button style={bS("#4f9eff")} onClick={()=>{onSave(items);onClose();}}>保存</button>
        </div>

        {/* Group tabs + edit */}
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:6,paddingBottom:4,scrollbarWidth:"none"}}>
          {["all",...groups].map(g=>(
            <button key={g} onClick={()=>setSelectedGroup(g)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1px solid ${selectedGroup===g?"#4f9eff":"#2a2f3d"}`,background:selectedGroup===g?"rgba(79,158,255,0.15)":"transparent",color:selectedGroup===g?"#4f9eff":"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700,whiteSpace:"nowrap"}}>
              {g==="all"?"すべて":g==="default"?"未分類":g} <span style={{fontSize:10,opacity:0.7}}>({items.filter(t=>!t.done&&(g==="all"||t.group===g)).length})</span>
            </button>
          ))}
          <button onClick={()=>setEditingGroup(v=>!v)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,border:`1px dashed ${editingGroup?"#4f9eff":"#2a2f3d"}`,background:editingGroup?"rgba(79,158,255,0.1)":"transparent",color:editingGroup?"#4f9eff":"#3d4560",cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700}}>
            {editingGroup?"✕ 閉じる":"⚙ 編集"}
          </button>
        </div>

        {/* Group manager */}
        {editingGroup&&(
          <div style={{background:"#161920",borderRadius:10,padding:10,marginBottom:8,border:"1px solid #2a2f3d"}}>
            <div style={{fontSize:11,color:"#6b7a99",marginBottom:8,fontWeight:700}}>グループ管理</div>
            {groups.filter(g=>g!=="default").map(g=>(
              <div key={g} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                <input
                  defaultValue={g}
                  style={{...iS,flex:1}}
                  onBlur={e=>{ const v=e.target.value.trim(); if(v&&v!==g){ setGroups(p=>p.map(x=>x===g?v:x)); setItems(p=>p.map(t=>t.group===g?{...t,group:v}:t)); }}}
                />
                <button onClick={()=>{ setGroups(p=>p.filter(x=>x!==g)); setItems(p=>p.map(t=>t.group===g?{...t,group:"default"}:t)); }} style={{background:"#f87171",border:"none",borderRadius:6,padding:"5px 8px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>削除</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <input style={{...iS,flex:1}} placeholder="新しいグループ名" value={newGrpName} onChange={e=>setNewGrpName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGroup()}/>
              <button onClick={addGroup} style={{background:"#34d399",border:"none",borderRadius:6,padding:"5px 10px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>追加</button>
            </div>
          </div>
        )}

        {/* Add input */}
        <div style={{background:"#161920",borderRadius:10,padding:12,marginBottom:10,border:"1px solid #2a2f3d"}}>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input ref={newRef} style={{...iS,flex:1}} placeholder="新しいタスク..." onKeyDown={e=>e.key==="Enter"&&add()}/>
            <button style={bS("#34d399")} onClick={add}>追加</button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
            <select value={newGroup} onChange={e=>setNewGroup(e.target.value)} style={{...iS,flex:1}}>
              {groups.map(g=><option key={g} value={g}>{g==="default"?"未分類":g}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#6b7a99",marginBottom:3}}>期限（この週になると週タスクに自動追加）</div>
              <input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} style={{...iS,width:"100%",boxSizing:"border-box",colorScheme:"dark"}}/>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div style={{overflowY:"auto",flex:1}}>
          {active.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:16,fontSize:BASE_FONT-1}}>タスクなし</div>}
          {active.map(t=>{
            const over=isOverdue(t), soon=isSoon(t);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 0",borderBottom:"1px solid #2a2f3d"}}>
                <div onClick={()=>toggle(t.id)} style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:2,border:`2px solid ${over?"#f87171":soon?"#fb923c":"#3d4560"}`,background:"transparent",cursor:"pointer"}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:BASE_FONT-1,fontWeight:600}}>{t.label}</div>
                  <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
                    {t.group&&<span style={{fontSize:10,background:"rgba(79,158,255,0.12)",color:"#4f9eff",borderRadius:4,padding:"1px 6px"}}>{t.group==="default"?"未分類":t.group}</span>}
                    {t.addedToWeek&&<span style={{fontSize:10,background:"rgba(251,146,60,0.12)",color:"#fb923c",borderRadius:4,padding:"1px 6px"}}>📋 今週に追加済み</span>}
                    {t.deadline&&<span style={{fontSize:10,background:over?"rgba(248,113,113,0.15)":soon?"rgba(251,146,60,0.15)":"rgba(255,255,255,0.06)",color:over?"#f87171":soon?"#fb923c":"#6b7a99",borderRadius:4,padding:"1px 6px"}}>
                      {over?"⚠ 期限切れ":"📅"} {t.deadline}
                    </span>}
                    <span style={{fontSize:10,color:"#3d4560"}}>追加: {t.createdAt}</span>
                  </div>
                </div>
                <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:"#3d4560",cursor:"pointer",fontSize:14,padding:"2px 4px",flexShrink:0}}>✕</button>
              </div>
            );
          })}

          {done.length>0&&(
            <div style={{marginTop:12}}>
              <button onClick={()=>setShowDone(v=>!v)} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700,padding:"4px 0",display:"flex",alignItems:"center",gap:6}}>
                {showDone?"▼":"▶"} 完了済み ({done.length}件)
              </button>
              {showDone&&done.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid #2a2f3d",opacity:0.5}}>
                  <div onClick={()=>toggle(t.id)} style={{width:20,height:20,borderRadius:5,flexShrink:0,border:"2px solid #34d399",background:"#34d399",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"#fff",fontSize:11}}>✓</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT-1,textDecoration:"line-through",color:"#6b7a99"}}>{t.label}</div>
                    <div style={{fontSize:10,color:"#3d4560"}}>完了: {t.doneAt}</div>
                  </div>
                  <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",color:"#3d4560",cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={()=>{onSave(items);onClose();}} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:10,width:"100%"}}>閉じる</button>
      </div>
    </div>
  );
}

// ─── Weekly Template Manager ──────────────────────────────────────────────────


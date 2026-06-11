import { useState, useRef } from "react";
import { BASE_FONT, todayStr } from "../../constants";

export default function LongTermModal({ tasks, onSave, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const muted  = t.muted  || "#3d4560";
  const accent = t.accent || "#4f8ef7";

  const [items,        setItems]        = useState(tasks.map(t=>({...t})));
  const [showDone,     setShowDone]     = useState(false);
  const [newDeadline,  setNewDeadline]  = useState("");
  const [newGroup,     setNewGroup]     = useState("default");
  const [editingGroup, setEditingGroup] = useState(false);
  const [editingId,    setEditingId]    = useState(null); // 編集中タスクID
  const [groups,       setGroups]       = useState(()=>{
    const gs = [...new Set(tasks.map(t=>t.group||"default"))];
    return gs.length ? gs : ["default"];
  });
  const [newGrpName,    setNewGrpName]    = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const newRef = useRef(null);

  const add = () => {
    const v = newRef.current?.value || "";
    if(!v.trim()) return;
    setItems(p=>[...p,{id:Date.now(),label:v.trim(),done:false,createdAt:todayStr(),group:newGroup,deadline:newDeadline||null,addedToWeek:false}]);
    if(newRef.current) newRef.current.value="";
    setNewDeadline("");
  };

  const toggle   = id => setItems(p=>p.map(t=>t.id===id?{...t,done:!t.done,doneAt:t.done?null:todayStr()}:t));
  const remove   = id => { setItems(p=>p.filter(t=>t.id!==id)); if(editingId===id) setEditingId(null); };
  const addGroup = () => { if(!newGrpName.trim()) return; setGroups(p=>[...p,newGrpName.trim()]); setNewGrpName(""); };

  const updateItem = (id, patch) => setItems(p=>p.map(t=>t.id===id?{...t,...patch}:t));

  const active = items.filter(t=>!t.done && (selectedGroup==="all"||t.group===selectedGroup));
  const done   = items.filter(t=>t.done  && (selectedGroup==="all"||t.group===selectedGroup));

  const isOverdue = t => t.deadline && !t.done && new Date(t.deadline) < new Date();
  const isSoon    = t => t.deadline && !t.done && !isOverdue(t) && (new Date(t.deadline)-new Date()) < 3*86400000;

  const bS = bg => ({background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT-2});
  const iS = {background:card2,border:`1px solid ${border}`,borderRadius:8,padding:"8px 10px",color:text,fontSize:BASE_FONT-2,outline:"none"};

  // タスク行（通常表示）
  const TaskRow = ({task}) => {
    const over = isOverdue(task), soon = isSoon(task);
    const isEditing = editingId === task.id;

    return (
      <div style={{borderBottom:`1px solid ${border}`}}>
        {/* 通常行 */}
        <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 0"}}>
          <div onClick={()=>toggle(task.id)} style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:2,border:`2px solid ${over?"#f87171":soon?"#fb923c":muted}`,background:"transparent",cursor:"pointer"}}/>
          <div style={{flex:1,cursor:"pointer"}} onClick={()=>setEditingId(isEditing?null:task.id)}>
            <div style={{fontSize:BASE_FONT-1,fontWeight:600,color:text}}>{task.label}</div>
            <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}>
              {task.group&&<span style={{fontSize:10,background:`rgba(${t.accent?t.accent.slice(1).match(/../g).map(x=>parseInt(x,16)).join(","):"79,142,247"},0.12)`,color:accent,borderRadius:4,padding:"1px 6px"}}>{task.group==="default"?"未分類":task.group}</span>}
              {task.addedToWeek&&<span style={{fontSize:10,background:"rgba(251,146,60,0.12)",color:"#fb923c",borderRadius:4,padding:"1px 6px"}}>📋 今週に追加済み</span>}
              {task.deadline
                ? <span style={{fontSize:10,background:over?"rgba(248,113,113,0.15)":soon?"rgba(251,146,60,0.15)":`rgba(${t.isDark?"255,255,255":"79,142,247"},0.06)`,color:over?"#f87171":soon?"#fb923c":sub,borderRadius:4,padding:"1px 6px"}}>
                    {over?"⚠ 期限切れ":"📅"} {task.deadline}
                  </span>
                : <span style={{fontSize:10,color:muted,borderRadius:4,padding:"1px 6px"}}>期限なし</span>
              }
              <span style={{fontSize:10,color:muted}}>追加: {task.createdAt}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            <button onClick={()=>setEditingId(isEditing?null:task.id)} style={{background:"none",border:`1px solid ${isEditing?accent:border}`,color:isEditing?accent:muted,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:10,fontWeight:700}}>
              {isEditing?"✕":"編集"}
            </button>
            <button onClick={()=>remove(task.id)} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:14,padding:"2px 4px"}}>✕</button>
          </div>
        </div>

        {/* 編集パネル */}
        {isEditing&&(
          <div style={{background:card2,borderRadius:10,padding:12,marginBottom:10,border:`1px solid ${accent}44`}}>
            <div style={{fontSize:10,color:accent,fontWeight:700,marginBottom:8}}>✏️ 編集中</div>

            {/* タスク名 */}
            <div style={{fontSize:10,color:sub,marginBottom:4}}>タスク名</div>
            <input
              style={{...iS,width:"100%",boxSizing:"border-box",marginBottom:10}}
              value={task.label}
              onChange={e=>updateItem(task.id,{label:e.target.value})}
            />

            {/* グループ */}
            <div style={{fontSize:10,color:sub,marginBottom:4}}>グループ</div>
            <select
              value={task.group||"default"}
              onChange={e=>updateItem(task.id,{group:e.target.value})}
              style={{...iS,width:"100%",boxSizing:"border-box",marginBottom:10}}
            >
              {groups.map(g=><option key={g} value={g}>{g==="default"?"未分類":g}</option>)}
            </select>

            {/* 期限 */}
            <div style={{fontSize:10,color:sub,marginBottom:4}}>期限日</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input
                type="date"
                value={task.deadline||""}
                onChange={e=>updateItem(task.id,{deadline:e.target.value||null,addedToWeek:false})}
                style={{...iS,flex:1,colorScheme:t.isDark?"dark":"light"}}
              />
              {task.deadline&&(
                <button
                  onClick={()=>updateItem(task.id,{deadline:null,addedToWeek:false})}
                  style={{background:"none",border:`1px solid ${border}`,borderRadius:6,padding:"6px 10px",color:muted,cursor:"pointer",fontSize:10,fontWeight:700,flexShrink:0}}
                >
                  削除
                </button>
              )}
            </div>

            <button
              onClick={()=>setEditingId(null)}
              style={{...bS(accent),width:"100%",marginTop:10}}
            >
              ✓ 確定
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={()=>{onSave(items);onClose();}}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:20,width:"100%",maxWidth:480,maxHeight:"90vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800,color:text}}>📌 長期タスク</div>
          <button style={bS(accent)} onClick={()=>{onSave(items);onClose();}}>保存</button>
        </div>

        {/* グループタブ */}
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:6,paddingBottom:4,scrollbarWidth:"none"}}>
          {["all",...groups].map(g=>(
            <button key={g} onClick={()=>setSelectedGroup(g)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1px solid ${selectedGroup===g?accent:border}`,background:selectedGroup===g?`rgba(${t.isDark?"79,142,247":"79,142,247"},0.15)`:"transparent",color:selectedGroup===g?accent:sub,cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700,whiteSpace:"nowrap"}}>
              {g==="all"?"すべて":g==="default"?"未分類":g} <span style={{fontSize:10,opacity:0.7}}>({items.filter(t=>!t.done&&(g==="all"||t.group===g)).length})</span>
            </button>
          ))}
          <button onClick={()=>setEditingGroup(v=>!v)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,border:`1px dashed ${editingGroup?accent:border}`,background:editingGroup?`rgba(79,142,247,0.1)`:"transparent",color:editingGroup?accent:muted,cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700}}>
            {editingGroup?"✕ 閉じる":"⚙ 編集"}
          </button>
        </div>

        {/* グループ管理 */}
        {editingGroup&&(
          <div style={{background:card2,borderRadius:10,padding:10,marginBottom:8,border:`1px solid ${border}`}}>
            <div style={{fontSize:11,color:sub,marginBottom:8,fontWeight:700}}>グループ管理</div>
            {groups.filter(g=>g!=="default").map(g=>(
              <div key={g} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                <input defaultValue={g} style={{...iS,flex:1}}
                  onBlur={e=>{ const v=e.target.value.trim(); if(v&&v!==g){ setGroups(p=>p.map(x=>x===g?v:x)); setItems(p=>p.map(t=>t.group===g?{...t,group:v}:t)); }}}/>
                <button onClick={()=>{ setGroups(p=>p.filter(x=>x!==g)); setItems(p=>p.map(t=>t.group===g?{...t,group:"default"}:t)); }} style={{background:"#f87171",border:"none",borderRadius:6,padding:"5px 8px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>削除</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <input style={{...iS,flex:1}} placeholder="新しいグループ名" value={newGrpName} onChange={e=>setNewGrpName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGroup()}/>
              <button onClick={addGroup} style={{background:"#34d399",border:"none",borderRadius:6,padding:"5px 10px",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>追加</button>
            </div>
          </div>
        )}

        {/* 追加フォーム */}
        <div style={{background:card2,borderRadius:10,padding:12,marginBottom:10,border:`1px solid ${border}`}}>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <input ref={newRef} style={{...iS,flex:1}} placeholder="新しいタスク..." onKeyDown={e=>e.key==="Enter"&&add()}/>
            <button style={bS("#34d399")} onClick={add}>追加</button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
            <select value={newGroup} onChange={e=>setNewGroup(e.target.value)} style={{...iS,flex:1}}>
              {groups.map(g=><option key={g} value={g}>{g==="default"?"未分類":g}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:sub,marginBottom:3}}>期限（この週になると週タスクに自動追加）</div>
            <input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)} style={{...iS,width:"100%",boxSizing:"border-box",colorScheme:t.isDark?"dark":"light"}}/>
          </div>
        </div>

        {/* タスクリスト */}
        <div style={{overflowY:"auto",flex:1}}>
          {active.length===0&&<div style={{textAlign:"center",color:sub,padding:16,fontSize:BASE_FONT-1}}>タスクなし</div>}
          {active.map(task=><TaskRow key={task.id} task={task}/>)}

          {done.length>0&&(
            <div style={{marginTop:12}}>
              <button onClick={()=>setShowDone(v=>!v)} style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:BASE_FONT-2,fontWeight:700,padding:"4px 0",display:"flex",alignItems:"center",gap:6}}>
                {showDone?"▼":"▶"} 完了済み ({done.length}件)
              </button>
              {showDone&&done.map(task=>(
                <div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${border}`,opacity:0.5}}>
                  <div onClick={()=>toggle(task.id)} style={{width:20,height:20,borderRadius:5,flexShrink:0,border:"2px solid #34d399",background:"#34d399",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"#fff",fontSize:11}}>✓</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:BASE_FONT-1,textDecoration:"line-through",color:sub}}>{task.label}</div>
                    <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                      {task.deadline&&<span style={{fontSize:10,color:muted}}>📅 {task.deadline}</span>}
                      <span style={{fontSize:10,color:muted}}>完了: {task.doneAt}</span>
                    </div>
                  </div>
                  <button onClick={()=>remove(task.id)} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={()=>{onSave(items);onClose();}} style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:BASE_FONT-2,paddingTop:10,width:"100%"}}>閉じる</button>
      </div>
    </div>
  );
}

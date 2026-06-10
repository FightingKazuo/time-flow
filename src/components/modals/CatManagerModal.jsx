import { useState } from "react";
import { BASE_FONT, PRESET_COLORS } from "../../constants";
import ColorPicker from "../ColorPicker";

export default function CatManagerModal({ categories, onChange, onClose, theme }) {
  const t      = theme || {};
  const card   = t.card   || "#1e2330";
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const text   = t.text   || "#e8ecf4";
  const sub    = t.sub    || "#6b7a99";
  const muted  = t.muted  || "#3d4560";
  const accent = t.accent || "#4f8ef7";

  const [cats,     setCats]     = useState(categories.map(c=>({...c})));
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editing,  setEditing]  = useState(null);

  const iS = {background:card2,border:`1px solid ${border}`,borderRadius:8,padding:"8px 10px",color:text,fontSize:BASE_FONT,outline:"none",flex:1};
  const bS = bg => ({padding:"7px 10px",borderRadius:8,border:"none",background:bg,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:11});

  const moveUp   = i => { if(i===0) return; const a=[...cats]; [a[i-1],a[i]]=[a[i],a[i-1]]; setCats(a); };
  const moveDown = i => { if(i===cats.length-1) return; const a=[...cats]; [a[i],a[i+1]]=[a[i+1],a[i]]; setCats(a); };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:card,borderRadius:"20px 20px 0 0",border:`1px solid ${border}`,padding:20,width:"100%",maxWidth:480,maxHeight:"82vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:BASE_FONT+2,fontWeight:800,color:text}}>カテゴリー管理</span>
          <button style={bS(accent)} onClick={()=>{onChange(cats);onClose();}}>完了</button>
        </div>
        {cats.map((c,i)=>(
          <div key={c.id} style={{marginBottom:8,background:card2,borderRadius:10,padding:10,border:`1px solid ${border}`}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                <button onClick={()=>moveUp(i)} disabled={i===0} style={{background:i===0?card:border,border:"none",borderRadius:4,width:24,height:22,color:i===0?muted:text,cursor:i===0?"not-allowed":"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
                <button onClick={()=>moveDown(i)} disabled={i===cats.length-1} style={{background:i===cats.length-1?card:border,border:"none",borderRadius:4,width:24,height:22,color:i===cats.length-1?muted:text,cursor:i===cats.length-1?"not-allowed":"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>↓</button>
              </div>
              <div style={{width:16,height:16,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <input style={{...iS,flex:1}} value={c.name} onChange={e=>setCats(p=>p.map(x=>x.id===c.id?{...x,name:e.target.value}:x))}/>
              <button style={{...bS(editing===c.id?accent:border),padding:"6px 8px"}} onClick={()=>setEditing(editing===c.id?null:c.id)}>🎨</button>
              <button style={{...bS("#f87171"),padding:"6px 8px"}} onClick={()=>setCats(p=>p.filter(x=>x.id!==c.id))}>✕</button>
            </div>
            {editing===c.id&&<ColorPicker value={c.color} onChange={col=>setCats(p=>p.map(x=>x.id===c.id?{...x,color:col}:x))}/>}
          </div>
        ))}
        <div style={{marginTop:10,background:card2,borderRadius:10,padding:12,border:`1px dashed ${border}`}}>
          <div style={{fontSize:11,color:sub,marginBottom:6}}>新しいカテゴリー</div>
          <div style={{display:"flex",gap:6}}>
            <input style={iS} placeholder="名前" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&newName.trim()){ setCats(p=>[...p,{id:Date.now().toString(),name:newName.trim(),color:newColor}]); setNewName(""); }}}/>
            <button style={bS("#34d399")} onClick={()=>{ if(!newName.trim()) return; setCats(p=>[...p,{id:Date.now().toString(),name:newName.trim(),color:newColor}]); setNewName(""); }}>追加</button>
          </div>
          <ColorPicker value={newColor} onChange={setNewColor}/>
        </div>
      </div>
    </div>
  );
}

import { useRef, useEffect } from "react";
export default function TaskInput({ onAdd, onCancel, inputStyle, btnStyle }) {
  const ref=useRef(null);
  const submit=()=>{ const v=ref.current?.value||""; if(v.trim()) onAdd(v.trim()); else onCancel(); };
  useEffect(()=>{ ref.current?.focus(); },[]);
  return (
    <div style={{display:"flex",gap:4,marginTop:6}}>
      <input ref={ref} style={inputStyle} placeholder="タスク名" defaultValue="" onKeyDown={e=>{ if(e.key==="Enter") submit(); if(e.key==="Escape") onCancel(); }}/>
      <button style={{...btnStyle(),padding:"5px 8px",fontSize:11}} onClick={submit}>✓</button>
      <button style={{...btnStyle("#2a2f3d"),padding:"5px 8px",fontSize:11}} onClick={onCancel}>✕</button>
    </div>
  );
}

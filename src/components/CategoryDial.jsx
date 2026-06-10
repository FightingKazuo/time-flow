import { useRef, useEffect } from "react";
import { hexRgb } from "../constants";

export default function CategoryDial({ categories, selected, onSelect, disabled, theme }) {
  const t      = theme || {};
  const card2  = t.card2  || "#161920";
  const border = t.border || "#2a2f3d";
  const sub    = t.sub    || "#6b7a99";

  const ref = useRef(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const idx=categories.findIndex(c=>c.id===selected);
    el.scrollLeft=idx*82-el.clientWidth/2+41;
  },[selected,categories]);

  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:sub,fontWeight:700,marginBottom:6,textAlign:"center"}}>カテゴリー</div>
      <div ref={ref} style={{display:"flex",gap:8,overflowX:"auto",padding:"4px 12px 6px",scrollSnapType:"x mandatory",scrollbarWidth:"none"}}>
        {categories.map(c=>{
          const a=selected===c.id;
          return (
            <div key={c.id} onClick={()=>!disabled&&onSelect(c.id)} style={{
              scrollSnapAlign:"center",flexShrink:0,width:72,padding:"10px 4px",
              borderRadius:10,
              border:`2px solid ${a?c.color:border}`,
              background:a?`rgba(${hexRgb(c.color)},0.18)`:card2,
              cursor:disabled?"not-allowed":"pointer",
              textAlign:"center",transition:"all 0.2s",
              transform:a?"scale(1.06)":"scale(1)",
              opacity:disabled&&!a?0.4:1,
            }}>
              <div style={{width:22,height:22,borderRadius:"50%",background:c.color,margin:"0 auto 5px",boxShadow:a?`0 0 10px ${c.color}88`:"none"}}/>
              <div style={{fontSize:11,fontWeight:700,color:a?c.color:sub}}>{c.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

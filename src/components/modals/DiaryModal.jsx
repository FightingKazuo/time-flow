import { useState } from "react";
import { BASE_FONT } from "../../constants";

export const DIARY_COLORS = [
  { id:"none",   label:"なし",     color:"#3d4560" },
  { id:"red",    label:"🔴 ネガティブ", color:"#f87171" },
  { id:"blue",   label:"🔵 普通",   color:"#60a5fa" },
  { id:"green",  label:"🟢 ポジティブ", color:"#34d399" },
  { id:"yellow", label:"🟡 教訓",   color:"#fbbf24" },
  { id:"purple", label:"🟣 備忘録", color:"#a78bfa" },
];

export default function DiaryModal({ date, diary, onSave, onClose }) {
  // diary は { text, color } または文字列（旧形式）
  const initText  = typeof diary === "object" ? (diary?.text||"")  : (diary||"");
  const initColor = typeof diary === "object" ? (diary?.color||"none") : "none";
  const [text,  setText]  = useState(initText);
  const [color, setColor] = useState(initColor);

  const save = () => {
    onSave({ text, color });
    onClose();
  };

  const selectedColor = DIARY_COLORS.find(c=>c.id===color) || DIARY_COLORS[0];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:`1px solid ${color!=="none"?selectedColor.color:"#2a2f3d"}`,padding:24,width:"100%",maxWidth:480,paddingBottom:36}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📔 日記</div>
            <div style={{fontSize:11,color:"#fbbf24"}}>{date}</div>
          </div>
          <button onClick={save} style={{background:"#4f9eff",border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:BASE_FONT}}>保存</button>
        </div>

        {/* 色タグ */}
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
          {DIARY_COLORS.map(c=>(
            <button key={c.id} onClick={()=>setColor(c.id)} style={{
              padding:"5px 10px",borderRadius:20,
              border:`1.5px solid ${color===c.id?c.color:"#2a2f3d"}`,
              background:color===c.id?`${c.color}22`:"transparent",
              color:color===c.id?c.color:"#6b7a99",
              cursor:"pointer",fontSize:BASE_FONT-3,fontWeight:700,
            }}>
              {c.label}
            </button>
          ))}
        </div>

        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="今日のことを書いておこう..."
          style={{width:"100%",boxSizing:"border-box",height:200,background:"#161920",
            border:`1px solid ${color!=="none"?selectedColor.color+"66":"#2a2f3d"}`,
            borderRadius:10,padding:14,color:"#e8ecf4",fontSize:BASE_FONT,
            resize:"none",outline:"none",lineHeight:1.8,fontFamily:"inherit"}}
          autoFocus/>
        <button onClick={onClose} style={{marginTop:10,background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-1,width:"100%"}}>キャンセル</button>
      </div>
    </div>
  );
}

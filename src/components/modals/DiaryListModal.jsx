import { useState } from "react";
import { BASE_FONT } from "../../constants";

export default function DiaryListModal({ diaries, onOpen, onClose }) {
  const [search,setSearch]=useState("");
  const entries=Object.entries(diaries).filter(([,v])=>v?.trim()).sort(([a],[b])=>b.localeCompare(a));
  const filtered=search?entries.filter(([d,t])=>d.includes(search)||t.includes(search)):entries;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={onClose}>
      <div style={{background:"#1e2330",borderRadius:"20px 20px 0 0",border:"1px solid #2a2f3d",padding:20,width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:BASE_FONT+2,fontWeight:800}}>📔 日記一覧</div>
          <span style={{fontSize:11,color:"#6b7a99"}}>{entries.length}件</span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="日付・内容で検索..."
          style={{background:"#161920",border:"1px solid #2a2f3d",borderRadius:8,padding:"7px 12px",color:"#e8ecf4",fontSize:BASE_FONT,outline:"none",marginBottom:10,width:"100%",boxSizing:"border-box"}}/>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.length===0&&<div style={{textAlign:"center",color:"#6b7a99",padding:24,fontSize:BASE_FONT}}>日記がありません</div>}
          {filtered.map(([date,text])=>(
            <div key={date} onClick={()=>onOpen(date)} style={{background:"#161920",borderRadius:10,border:"1px solid #2a2f3d",padding:"12px 14px",marginBottom:8,cursor:"pointer"}}>
              <div style={{fontSize:11,color:"#fbbf24",fontWeight:700,marginBottom:4}}>{date}</div>
              <div style={{fontSize:BASE_FONT-1,color:"#94a3b8",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",whiteSpace:"pre-wrap"}}>{text}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7a99",cursor:"pointer",fontSize:BASE_FONT-1,paddingTop:12}}>閉じる</button>
      </div>
    </div>
  );
}



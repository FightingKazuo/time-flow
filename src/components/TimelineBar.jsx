import { fmtHMS } from "../constants";

export default function TimelineBar({ logs, categories, date }) {
  const catMap = Object.fromEntries(categories.map(c=>[c.id,c]));
  const dayLogs = logs.filter(l=>l.date===date && l.startHour != null);
  const total = dayLogs.reduce((s,l)=>s+l.duration,0);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#6b7a99",fontWeight:700}}>24時間タイムライン</span>
        <span style={{fontSize:11,color:"#6b7a99"}}>{fmtHMS(total)||"0秒"}</span>
      </div>
      <div style={{position:"relative",height:56,background:"#161920",borderRadius:8,overflow:"hidden",border:"1px solid #2a2f3d",marginBottom:6}}>
        {[6,9,12,15,18,21].map(h=>(
          <div key={h} style={{position:"absolute",left:`${(h/24)*100}%`,top:0,bottom:0,width:1,background:"#2a2f3d"}}>
            <span style={{position:"absolute",top:2,left:2,fontSize:8,color:"#3d4560"}}>{h}</span>
          </div>
        ))}
        {dayLogs.map((l,i)=>{
          const cat=catMap[l.catId];
          return <div key={i} title={`${cat?.name||""} ${fmtHMS(l.duration)}`} style={{position:"absolute",left:`${Math.min((l.startHour/24)*100,99)}%`,width:`${Math.min((l.duration/86400)*100,100-(l.startHour/24)*100)}%`,top:8,bottom:8,background:cat?.color||"#6b7a99",borderRadius:3,minWidth:3,opacity:0.85}}/>;
        })}
      </div>
      {dayLogs.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px"}}>
          {Object.entries(dayLogs.reduce((acc,l)=>{ acc[l.catId]=(acc[l.catId]||0)+l.duration; return acc; },{})).map(([catId,dur])=>{
            const cat=catMap[catId];
            return <div key={catId} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:cat?.color||"#6b7a99"}}/><span style={{fontSize:10,color:"#94a3b8"}}>{cat?.name} {fmtHMS(dur)}</span></div>;
          })}
        </div>
      )}
    </div>
  );
}

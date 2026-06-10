import { fmtHMS } from "../constants";

const START_H = 5;
const END_H   = 24;
const SPAN    = END_H - START_H;

export default function TimelineBar({ logs, categories, date, theme }) {
  const t       = theme || {};
  const card2   = t.card2  || "#161920";
  const border  = t.border || "#2a2f3d";
  const sub     = t.sub    || "#6b7a99";
  const muted   = t.muted  || "#3d4560";

  const catMap  = Object.fromEntries(categories.map(c=>[c.id,c]));
  const dayLogs = logs.filter(l=>l.date===date && l.startHour != null);
  const total   = dayLogs.reduce((s,l)=>s+l.duration,0);
  const toX     = h => Math.max(0, Math.min(((h - START_H) / SPAN) * 100, 100));
  const TICKS   = [6, 9, 12, 15, 18, 21, 24];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:sub,fontWeight:700}}>タイムライン（5〜24時）</span>
        <span style={{fontSize:11,color:sub}}>{fmtHMS(total)||"0秒"}</span>
      </div>
      <div style={{position:"relative",height:48,background:card2,borderRadius:8,overflow:"hidden",border:`1px solid ${border}`,marginBottom:4}}>
        {TICKS.map(h=>(
          <div key={h} style={{position:"absolute",left:`${toX(h)}%`,top:0,bottom:0,width:1,background:border,zIndex:1}}>
            <span style={{position:"absolute",top:2,left:2,fontSize:8,color:muted,whiteSpace:"nowrap"}}>{h}</span>
          </div>
        ))}
        {dayLogs.map((l,i)=>{
          const cat      = catMap[l.catId];
          const left     = toX(l.startHour);
          const widthPct = Math.min((l.duration / 3600) / SPAN * 100, 100 - left);
          return (
            <div key={i}
              title={`${cat?.name||""} ${fmtHMS(l.duration)}`}
              style={{
                position:"absolute",
                left:`${left}%`,
                width:`${Math.max(widthPct, 0.5)}%`,
                top:10, bottom:10,
                background:cat?.color||sub,
                borderRadius:3,
                minWidth:4,
                opacity:0.9,
                zIndex:2,
              }}
            />
          );
        })}
      </div>
      {dayLogs.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px"}}>
          {Object.entries(dayLogs.reduce((acc,l)=>{ acc[l.catId]=(acc[l.catId]||0)+l.duration; return acc; },{})).map(([cid,dur])=>{
            const cat=catMap[cid];
            return <div key={cid} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:2,background:cat?.color||sub}}/>
              <span style={{fontSize:10,color:sub}}>{cat?.name} {fmtHMS(dur)}</span>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

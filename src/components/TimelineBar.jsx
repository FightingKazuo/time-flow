import { fmtHMS } from "../constants";

const START_H = 5;   // 表示開始時刻
const END_H   = 24;  // 表示終了時刻
const SPAN    = END_H - START_H; // 19時間

export default function TimelineBar({ logs, categories, date }) {
  const catMap  = Object.fromEntries(categories.map(c=>[c.id,c]));
  const dayLogs = logs.filter(l=>l.date===date && l.startHour != null);
  const total   = dayLogs.reduce((s,l)=>s+l.duration,0);

  // 時間→バー上の%位置（5〜24時の範囲）
  const toX = h => Math.max(0, Math.min(((h - START_H) / SPAN) * 100, 100));

  const TICKS = [6, 9, 12, 15, 18, 21, 24];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:"#6b7a99",fontWeight:700}}>タイムライン（5〜24時）</span>
        <span style={{fontSize:11,color:"#6b7a99"}}>{fmtHMS(total)||"0秒"}</span>
      </div>
      <div style={{position:"relative",height:48,background:"#161920",borderRadius:8,overflow:"hidden",border:"1px solid #2a2f3d",marginBottom:4}}>
        {/* 目盛り線 */}
        {TICKS.map(h=>(
          <div key={h} style={{position:"absolute",left:`${toX(h)}%`,top:0,bottom:0,width:1,background:"#2a2f3d",zIndex:1}}>
            <span style={{position:"absolute",top:2,left:2,fontSize:8,color:"#3d4560",whiteSpace:"nowrap"}}>{h}</span>
          </div>
        ))}
        {/* セッションバー */}
        {dayLogs.map((l,i)=>{
          const cat   = catMap[l.catId];
          const left  = toX(l.startHour);
          const widthPct = Math.min((l.duration / 3600) / SPAN * 100, 100 - left);
          return (
            <div key={i}
              title={`${cat?.name||""} ${fmtHMS(l.duration)}`}
              style={{
                position:"absolute",
                left:`${left}%`,
                width:`${Math.max(widthPct, 0.5)}%`,
                top:10, bottom:10,
                background:cat?.color||"#6b7a99",
                borderRadius:3,
                minWidth:4,
                opacity:0.9,
                zIndex:2,
              }}
            />
          );
        })}
      </div>
      {/* 凡例 */}
      {dayLogs.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px"}}>
          {Object.entries(dayLogs.reduce((acc,l)=>{ acc[l.catId]=(acc[l.catId]||0)+l.duration; return acc; },{})).map(([cid,dur])=>{
            const cat=catMap[cid];
            return <div key={cid} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:8,height:8,borderRadius:2,background:cat?.color||"#6b7a99"}}/>
              <span style={{fontSize:10,color:"#94a3b8"}}>{cat?.name} {fmtHMS(dur)}</span>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

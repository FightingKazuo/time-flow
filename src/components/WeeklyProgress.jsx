import { BASE_FONT, DAYS_LABEL, fmtHM, fmtHMS, fmtDate, todayStr, todayDayIdx, getDayDate, getWeekMonday, dayDateStr, pad } from "../constants";

export default function WeeklyProgress({ weeklyTasks, customTasks, logs, diaries, goalHours, onSelectDay, selectedDay, studyCatId }) {
  const days=DAYS_LABEL.map((_,i)=>{ const wt=weeklyTasks[i]||[],ct=customTasks[i]||[],all=[...wt,...ct]; return {day:DAYS_LABEL[i],total:all.length,done:all.filter(t=>t.done).length}; });
  const totalT=days.reduce((s,d)=>s+d.total,0), doneT=days.reduce((s,d)=>s+d.done,0);
  const taskPct=totalT>0?Math.round(doneT/totalT*100):0;
  const studyWeekTotal=logs.filter(l=>l.catId===studyCatId).reduce((s,l)=>s+l.duration,0);
  const studyTodayTotal=logs.filter(l=>l.catId===studyCatId&&l.date===todayStr()).reduce((s,l)=>s+l.duration,0);
  const timePct=goalHours>0?Math.min(Math.round(studyWeekTotal/goalHours/3600*100),100):0;
  const goalReached=studyWeekTotal>=goalHours*3600;
  const todayTotal=logs.filter(l=>l.date===todayStr()).reduce((s,l)=>s+l.duration,0);
  const mon=getWeekMonday(); let diaryCount=0;
  for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(d.getDate()+i); if(diaries[fmtDate(d)]?.trim()) diaryCount++; }
  const diaryPct=Math.round(diaryCount/7*100);
  const selDate=fmtDate(getDayDate(selectedDay));
  const selLogs=logs.filter(l=>l.date===selDate);
  const selTotal=selLogs.reduce((s,l)=>s+l.duration,0);
  const selStudyTotal=selLogs.filter(l=>l.catId===studyCatId).reduce((s,l)=>s+l.duration,0);
  const selD=days[selectedDay];
  const selTaskPct=selD.total>0?Math.round(selD.done/selD.total*100):0;

  // リング：大きめに
  const Ring=({pct,color,label,sub,achieved})=>{
    const r=28, c=2*Math.PI*r, d=c*(1-pct/100);
    return <div style={{textAlign:"center"}}>
      <svg width="72" height="72" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#2a2f3d" strokeWidth="6"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={d}
          transform="rotate(-90 32 32)" style={{transition:"stroke-dashoffset 0.6s"}}/>
        <text x="32" y="37" textAnchor="middle" fill={color} fontSize="12" fontWeight="800" fontFamily="monospace">{pct}%</text>
      </svg>
      <div style={{fontSize:BASE_FONT-4,fontWeight:700,color:"#e8ecf4",marginTop:2}}>{label}{achieved&&<span style={{marginLeft:2}}>🎯</span>}</div>
      <div style={{fontSize:BASE_FONT-5,color:"#6b7a99"}}>{sub}</div>
    </div>;
  };

  return (
    <div style={{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:14,marginBottom:12}}>
      {goalReached&&<div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:BASE_FONT-2,color:"#34d399",fontWeight:700,textAlign:"center"}}>🎯 今週の勉強目標達成！{fmtHM(studyWeekTotal)} / {goalHours}h</div>}
      <div style={{fontSize:BASE_FONT-2,fontWeight:800,marginBottom:12,color:"#6b7a99"}}>今週の進捗</div>

      {/* 3リング + 今日の合計 */}
      <div style={{display:"flex",justifyContent:"space-around",alignItems:"flex-start",marginBottom:14}}>
        <Ring pct={taskPct}  color="#4f9eff" label="タスク"  sub={`${doneT}/${totalT}`}/>
        <Ring pct={timePct}  color="#34d399" label="勉強目標" sub={`${fmtHM(studyWeekTotal)}/${goalHours}h`} achieved={goalReached}/>
        <Ring pct={diaryPct} color="#fbbf24" label="日記"    sub={`${diaryCount}/7日`}/>
        <div style={{textAlign:"center",paddingTop:6}}>
          <div style={{fontSize:20,fontWeight:900,color:"#fb923c",fontFamily:"monospace"}}>{fmtHM(todayTotal)||"0m"}</div>
          <div style={{fontSize:BASE_FONT-5,fontWeight:700,color:"#e8ecf4",marginTop:3}}>今日合計</div>
          <div style={{fontSize:BASE_FONT-5,color:"#4f9eff",marginTop:2}}>{fmtHM(studyTodayTotal)||"0m"} 勉強</div>
        </div>
      </div>

      {/* 日別バー */}
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {days.map((d,i)=>{ const pct=d.total>0?d.done/d.total:0, isSel=i===selectedDay, isToday=i===todayDayIdx(); return (
          <div key={i} onClick={()=>onSelectDay(i)} style={{flex:1,textAlign:"center",cursor:"pointer"}}>
            <div style={{height:40,background:"#161920",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse",border:isSel?"1.5px solid #4f9eff":"1.5px solid transparent",transition:"border 0.2s"}}>
              <div style={{height:`${pct*100}%`,background:isToday?"#4f9eff":"#2a2f3d",transition:"height 0.5s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:BASE_FONT-5,color:isSel?"#4f9eff":isToday?"#94a3b8":"#6b7a99",marginTop:3,fontWeight:isSel||isToday?700:400}}>{d.day}</div>
          </div>
        );})}
      </div>

      {/* 選択日詳細 */}
      <div style={{background:"#161920",borderRadius:8,padding:10,border:"1px solid #2a2f3d"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:BASE_FONT-2,fontWeight:700,color:"#4f9eff"}}>{DAYS_LABEL[selectedDay]} {dayDateStr(selectedDay)} の進捗</span>
          {diaries[selDate]?.trim()
            ?<span style={{fontSize:BASE_FONT-4,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf2466",borderRadius:6,padding:"2px 8px"}}>📔 日記あり</span>
            :<span style={{fontSize:BASE_FONT-4,color:"#3d4560",background:"#1e2330",border:"1px solid #2a2f3d",borderRadius:6,padding:"2px 8px"}}>日記なし</span>
          }
        </div>
        <div style={{display:"flex",gap:16}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#4f9eff"}}>{selTaskPct}%</div><div style={{fontSize:BASE_FONT-5,color:"#6b7a99"}}>タスク {selD.done}/{selD.total}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#34d399"}}>{fmtHM(selStudyTotal)||"0m"}</div><div style={{fontSize:BASE_FONT-5,color:"#6b7a99"}}>勉強時間</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#94a3b8"}}>{fmtHM(selTotal)||"0m"}</div><div style={{fontSize:BASE_FONT-5,color:"#6b7a99"}}>合計時間</div></div>
        </div>
      </div>
    </div>
  );
}

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

  const Ring=({pct,color,label,sub,achieved})=>{
    const r=20,c=2*Math.PI*r,d=c*(1-pct/100);
    return <div style={{textAlign:"center"}}>
      <svg width="56" height="56" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#2a2f3d" strokeWidth="5"/>
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={d} transform="rotate(-90 24 24)" style={{transition:"stroke-dashoffset 0.6s"}}/>
        <text x="24" y="28" textAnchor="middle" fill={color} fontSize="10" fontWeight="800" fontFamily="monospace">{pct}%</text>
      </svg>
      <div style={{fontSize:10,fontWeight:700,color:"#e8ecf4",marginTop:2}}>{label}{achieved&&<span style={{marginLeft:2}}>🎯</span>}</div>
      <div style={{fontSize:9,color:"#6b7a99"}}>{sub}</div>
    </div>;
  };


  return (
    <div style={{background:"#1e2330",borderRadius:12,border:"1px solid #2a2f3d",padding:14,marginBottom:12}}>
      {goalReached&&<div style={{background:"rgba(52,211,153,0.12)",border:"1px solid #34d399",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:BASE_FONT-2,color:"#34d399",fontWeight:700,textAlign:"center"}}>🎯 今週の勉強目標達成！{fmtHM(studyWeekTotal)} / {goalHours}h</div>}
      <div style={{fontSize:BASE_FONT-2,fontWeight:800,marginBottom:10,color:"#6b7a99"}}>今週の進捗</div>
      <div style={{display:"flex",justifyContent:"space-around",marginBottom:14}}>
        <Ring pct={taskPct} color="#4f9eff" label="タスク" sub={`${doneT}/${totalT}`}/>
        <Ring pct={timePct} color="#34d399" label="勉強目標" sub={`${fmtHM(studyWeekTotal)}/${goalHours}h`} achieved={goalReached}/>
        <Ring pct={diaryPct} color="#fbbf24" label="日記" sub={`${diaryCount}/7日`}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#fb923c",fontFamily:"monospace",marginTop:4}}>{fmtHM(todayTotal)||"0m"}</div>
          <div style={{fontSize:9,fontWeight:700,color:"#e8ecf4",marginTop:2}}>今日合計</div>
          <div style={{fontSize:9,color:"#4f9eff"}}>{fmtHM(studyTodayTotal)||"0m"} 勉強</div>
        </div>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:10}}>
        {days.map((d,i)=>{ const pct=d.total>0?d.done/d.total:0, isSel=i===selectedDay, isToday=i===todayDayIdx(); return (
          <div key={i} onClick={()=>onSelectDay(i)} style={{flex:1,textAlign:"center",cursor:"pointer"}}>
            <div style={{height:36,background:"#161920",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse",border:isSel?"1.5px solid #4f9eff":"1.5px solid transparent",transition:"border 0.2s"}}>
              <div style={{height:`${pct*100}%`,background:isToday?"#4f9eff":"#2a2f3d",transition:"height 0.5s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:9,color:isSel?"#4f9eff":isToday?"#94a3b8":"#6b7a99",marginTop:2,fontWeight:isSel||isToday?700:400}}>{d.day}</div>
          </div>
        );})}
      </div>
      <div style={{background:"#161920",borderRadius:8,padding:10,border:"1px solid #2a2f3d"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:11,fontWeight:700,color:"#4f9eff"}}>{DAYS_LABEL[selectedDay]} {dayDateStr(selectedDay)} の進捗</span>
          {diaries[selDate]?.trim()
            ?<span style={{fontSize:10,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,0.12)",border:"1px solid #fbbf2466",borderRadius:6,padding:"2px 8px"}}>📔 日記あり</span>
            :<span style={{fontSize:10,color:"#3d4560",background:"#1e2330",border:"1px solid #2a2f3d",borderRadius:6,padding:"2px 8px"}}>日記なし</span>
          }
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:"#4f9eff"}}>{selTaskPct}%</div><div style={{fontSize:9,color:"#6b7a99"}}>タスク {selD.done}/{selD.total}</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:"#34d399"}}>{fmtHM(selStudyTotal)||"0m"}</div><div style={{fontSize:9,color:"#6b7a99"}}>勉強時間</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,color:"#94a3b8"}}>{fmtHM(selTotal)||"0m"}</div><div style={{fontSize:9,color:"#6b7a99"}}>合計時間</div></div>
        </div>
      </div>
    </div>
  );
}
